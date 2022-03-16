"use strict";
let contract = require('truffle-contract');
let Web3 = require('web3');
let Web3WsProvider = require('web3-providers-ws');
let ethers = require('ethers');
let axios = require("axios");
let ipfsAPI = require("ipfs-api");
const fs = require('fs');

const { create } = require("ipfs-http-client");

const projectId = '1z8qlzYj2AXroPUyrvd4UD70Rd1'
const projectSecret = '33a8822b1df29fdc33d0930aab075a7b'
const auth = 'Basic ' + Buffer.from(projectId + ':' + projectSecret).toString('base64');

const ipfs = create({
    host: 'ipfs.infura.io',
    port: 5001,
    protocol: 'https',
    headers: {
        authorization: auth
    }
})

let HDWalletProvider = require('@truffle/hdwallet-provider');
require('dotenv').config({ path: './.env' }); // update process.env.

const NON_COHORT = require('../build/contracts/ValidationsNoCohort.json');
const NODE_OPERATIONS = require('../build/contracts/NodeOperations.json')
const MEMBERS = require('../build/contracts/Members.json');
const QUEUE = require('../build/contracts/Queue.json');

//TODO: this module is still copied from https://github.com/Auditchain/Reporting-Validation-Engine/tree/main/clientExamples/pacioliClient:
const pacioli = require('./pacioliClient');

// import ethereum connection strings.
const ropsten_infura_server = process.env.ROPSTEN_INFURA_SERVER;
const rinkeby_infura_server = process.env.RINKEBY_INFURA_SERVER;
const main_infura_server = process.env.MAINNET_INFURA_SERVER;
const goerli_infura_server = process.env.GOERLI_INFURA_SERVER
const mumbai_server = process.env.MUMBAI_SERVER;
const local_host = process.env.LOCAL;
const mnemonic = process.env.MNEMONIC;

// process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0; // required only for accessing Pacioli via callRemote(..)


// Address for smart contracts
const nonCohortAddress = process.env.VALIDATIONS_NO_COHORT_ADDRESS;
const nodeOperationsAddress = process.env.NODE_OPERATIONS_ADDRESS;
const members = process.env.MEMBER_ADDRESS;
const queue = process.env.QUEUE_ADDRESS;

let lastTransaction;
let validatorDetails = null;
let agentBornAT;


const provider = new Web3WsProvider(process.env.WEBSOCKET_PROVIDER, {
    clientConfig: {
        keepalive: true,
        keepaliveInterval: 60000, // ms
        timeout: 20000, // ms
    },
    // Enable auto reconnection
    reconnect: {
        auto: true,
        delay: 5000, // ms
        maxAttempts: 5,
        onTimeout: true
    }
})

//TODO: Remove this line once verified that replacement above is fixed.
// const provider = new Web3.providers.WebsocketProvider(process.env.WEBSOCKET_PROVIDER); // e.g. 'ws://localhost:8545'
const web3 = new Web3(provider);
let nonce;
let mutex = true;
let waitingNum = 0;
let setIntervalId;
let setVoteIntervalId;

// this may help with some web 3 providers with brittle web sockets connections:
// const agentBornAT = Date.now();
// setInterval( //hack to keep alive our brittle websocket, which tends to close after some inactivity
//     () => (web3.eth.getBlockNumber().then(what => console.log(`ran ${(Date.now() - agentBornAT) / 1000} seconds; current block ${what}`))),
//     60000);

let nonCohort = new web3.eth.Contract(NON_COHORT["abi"], nonCohortAddress);
let queueContract = new web3.eth.Contract(QUEUE["abi"], queue);


let ipfsBase = 'https://ipfs.infura.io/ipfs/';

let ipfs1 = ipfsAPI('ipfs.infura.io', 5001, {
    protocol: 'https'
}) // Connect to IPFS

let nonCohortValidate;
let nodeOperations;
let providerForUpdate;
let nodeOperationsPreEvent;
let membersContract;
// let queueContract;
let owner;
let validationCount = 0;

const GEO_CACHE_FILENAME = ".myLocation.json";
// cf. https://www.ip2location.com/web-service/ip2location :
const ipLocatorURL = `https://api.ip2location.com/v2/?key=${process.env.LOCATION_KEY}&package=WS5`;

async function fetchValidatorDetails(key) {
    const web3_reader = web3;
    const owner = providerForUpdate.addresses[0];

    //const entityName = await membersContract.methods.user(owner, 1).call();
    var entityName;
    try { entityName = await membersContract.methods.user(owner, 1).call() }
    catch (ex) { console.log("EXCEPTION in fetchValidatorDetails:" + ex) };
    //BUG in this version: EXCEPTION in fetchValidatorDetails:Error: data out-of-bounds (length=3, offset=32, code=BUFFER_OVERRUN, version=abi/5.0.7)
    // To reproduce:
    // node scripts/pacioliAgent.js 0xd66f2ee9bc1eda34087ccd5e5ac699194b7a34f12fbda8e115fb2506e3740429

    var details = { nickname: entityName, address: owner };
    try {
        if (process.env.LOCATION_KEY) {
            var myLocation;
            if (fs.existsSync(GEO_CACHE_FILENAME)) {
                console.log("Loading geo location from cache...");
                myLocation = JSON.parse(fs.readFileSync(GEO_CACHE_FILENAME));
            } else {
                console.log(`Querying IP locator service at ${ipLocatorURL}...`);
                myLocation = (await axios.get(ipLocatorURL)).data;
                fs.writeFileSync(GEO_CACHE_FILENAME, JSON.stringify(myLocation));
            }
            details['country'] = myLocation.country_name;
            details['city'] = myLocation.city_name;
            details['latitude'] = myLocation.latitude;
            details['longitude'] = myLocation.longitude;
        }
    } catch (e) {
        console.log("Could not georeference: " + e);
    }
    return details;
}

/**
 * @dev {initialize smart contracts with the web socket provider}
 * @param {account of this operator} account 
*/
async function setUpContracts(account) {


    // providerForUpdate = new HDWalletProvider(account, mumbai_server); // change to main_infura_server or another testnet. 
    providerForUpdate = new HDWalletProvider(account, local_host); // change to main_infura_server or another testnet. xx`

    const web3Update = new Web3(providerForUpdate);
    nonCohortValidate = new web3Update.eth.Contract(NON_COHORT["abi"], nonCohortAddress);
    nodeOperations = new web3Update.eth.Contract(NODE_OPERATIONS["abi"], nodeOperationsAddress);
    nodeOperationsPreEvent = new web3Update.eth.Contract(NODE_OPERATIONS["abi"], nodeOperationsAddress);
    membersContract = new web3Update.eth.Contract(MEMBERS["abi"], members);
    // queueContract = new web3Update.eth.Contract(QUEUE["abi"], queue);

    owner = providerForUpdate.addresses[0];
}


/** 
 * @dev Call Pacioli endpoint and receive report, then store it on IPFS
 * @param  {contains information about the location of the submitted report on IPFS by the data subscriber } metadatatUrl
 * @param  {blockchain transaction hash} trxHash
 * @returns {location of Pacioli report on IPFS and result of validation valid or not}
 */
async function verifyPacioli1(metadatatUrl, trxHash) {

    const result = await ipfs1.files.cat(metadatatUrl);
    const reportUrl = JSON.parse(result)["reportUrl"];

    console.log("[1 " + trxHash + "]" + "  Querying Pacioli " + reportUrl);
    // const reportContent = await pacioli.callRemote(reportUrl, trxHash, true)
    //     .catch(error => console.log("ERROR: " + error));
    const reportContent = await pacioli.callLocal(reportUrl, trxHash, true)
        .catch(error => console.log("ERROR: " + error));


    if (!reportContent)
        return [null, false];

    const jsonStringFromObject = JSON.stringify(reportContent);
    const bufRule = Buffer.from(jsonStringFromObject);

    console.log("[2 " + trxHash + "] Saving Pacioli Results to IPFS");

    const reportFile = [
        {
            path: "Pacioli.json",
            content: bufRule
        }];
    const resultPacioli = await ipfs.add(reportFile, { wrapWithDirectory: true });
    const pacioliIPFS = resultPacioli.cid + '/' + "Pacioli.json"

    console.log("[3 " + trxHash + "] Pacioli report saved at: " + ipfsBase + pacioliIPFS);

    return [pacioliIPFS, reportContent.isValid];
}

// TODO:  Use only for testing to bypass calling Pacioli
async function verifyPacioli(metadatatUrl, trxHash) {

    return ["QmSNQetWJuvwahuQbxJwEMoa5yPprfWdSqhJUZaSTKJ4Mg/AuditchainMetadataReport.json", 0]
}


/**
 *  @dev {Store the metadata file on IPFS}
 * @param {url of the report to validate} url 
 * @param {IFPS link of pacioli report} reportPacioliIPFSUrl 
 * @param {blockchain transaction hash} trxHash 
 * @param {if report is valid} isValid 
 * @returns urlMetadata and reportHash
 */
async function uploadMetadataToIpfs(url, reportPacioliIPFSUrl, trxHash, isValid) {

    const reportContent = (await axios.get(ipfsBase + url)).data;
    const reportHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(reportContent));

    console.log("[4 " + trxHash + "] Creating metadata file.");

    let metaDataObject = {
        reportUrl: ipfsBase + url,
        reportHash: reportHash,
        reportPacioli: ipfsBase + reportPacioliIPFSUrl,
        validatorDetails: validatorDetails,
        result: isValid
    };

    const jsonStringFromObject = JSON.stringify(metaDataObject);
    const buf = Buffer.from(jsonStringFromObject);
    const metadataFile = [
        {
            path: "AuditchainMetadataReport.json",
            content: buf
        }];

    const result = await ipfs.add(metadataFile, { wrapWithDirectory: true });
    const urlMetadata = result.cid + '/' + "AuditchainMetadataReport.json";

    console.log("[5 " + trxHash + "] Metadata created: " + ipfsBase + urlMetadata);
    return [urlMetadata, reportHash];
}


/**
 * @dev call Pacioli and pass isValid result to validation function. Save metadata file on IPFS. 
 * @param {url of the report to process} url  
 * @param {transaction hash in question} trxHash 
 * @param {hash of document in question} documentHash 
 * @param {block time transaction was initiated} initTime 
 * @param {data subscriber who initiated transaction} subscriber 
 * @returns {to be determined based on Pacioli error TODO:}
 */
async function executeVerification(url, trxHash, documentHash, initTime, subscriber) {

    const [reportPacioliIPFSUrl, isValid] = await verifyPacioli(url, trxHash);

    if (!reportPacioliIPFSUrl) {
        console.log("FAILED execution of verifyPacioli for " + url);
        return;
        //TODO: what to do here?
    }

    const [metaDataLink, reportHash] = await uploadMetadataToIpfs(url, reportPacioliIPFSUrl, trxHash, isValid);

    console.log("Created metadata file for tx:", trxHash)
    await validate(documentHash, initTime, isValid ? 1 : 2, trxHash, metaDataLink, reportHash, subscriber);
}


/**
 * @dev Validate the report
 * @param {hash of the document to validate} hash 
 * @param {time validation has been initiated} initTime 
 * @param {decision of the validator} choice 
 * @param {address of the validator} validator 
 */
async function validate(documentHash, initTime, choice, trxHash, valUrl, reportHash, subscriber) {

    console.log("[6 " + trxHash + "] Waiting for validation transaction to complete... ");



    if (mutex) {
        mutex = false;
        const nonce = await web3.eth.getTransactionCount(owner);

        // if (checkNonce > nonce)
        //     nonce = checkNonce;

        console.log("Nonce value from validate:", nonce);

        nonCohortValidate.methods
            .validate(documentHash, initTime, subscriber, choice, valUrl, reportHash)
            .send({ from: owner, gas: 900000, nonce: nonce })
            .on("receipt", function (receipt) {
                const event = receipt.events.ValidatorValidated.returnValues;
                let msg;

                if (choice == 1)
                    console.log("[7 " + trxHash + "] Request has been validated as acceptable.")
                else
                    console.log("[7 " + trxHash + "] Request has been validated as adverse");

                validationCount++
                console.log("Total validation count:" + validationCount);
                mutex = true;
                // nonce++;

            })
            .on("error", function (error) {
                mutex = true;
                // nonce++;
                console.log("An error occurred in [validate] for transaction " + trxHash + "  ", error)
            });
    } else {

        console.log("--------------------------------Waiting for 4 seconds validate");
        await sleep(4000);
        await validate(documentHash, initTime, choice, trxHash, valUrl, reportHash, subscriber);
    }


}


/**
 * @dev {To implement wait}
 * @param {number of milliseconds to wait} ms 
 * @returns {Promise}
 */
function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

/**
 * @dev {Verify if hashes match. Validator checks hash of their own validation with the hashes of winners}
 * @param {containing all details } event 
 * @returns {vote which has been determined by comparing hashes true or false} vote
 * @returns {winner address for which check was done } winnerAddress
 */

async function checkHash(event) {

    const count = event.returnValues.winners.length;
    const winnerSelected = Math.floor((Math.random() * count));
    const winnerAddress = event.returnValues.winners[winnerSelected];
    const validationHash = event.returnValues.validationHash;
    // const owner = providerForUpdate.addresses[0];

    console.log("[8 " + event.transactionHash + "] Verifying winner validation for account:" + winnerAddress)

    let validation = await nonCohortValidate.methods.collectValidationResults(validationHash).call();

    let winnerReportUrl, myReportUrl, winnerReportHash, myReportHash = 0;
    let times = 0;

    let winnerHashFound, ownerHashFound;
    for (let i = 0; i < validation[0].length; i++) {

        times++;

        if (validation[0][i].toLowerCase() == winnerAddress.toLowerCase()) {
            winnerReportUrl = validation[4][i];
            winnerReportHash = validation[5][i];
            winnerHashFound = true;
        }

        if (validation[0][i].toLowerCase() == owner) {
            myReportUrl = validation[4][i];
            myReportHash = validation[5][i];
            ownerHashFound = true;
        }

        if (myReportHash == 0 && i == validation[0].length - 1) {
            if (times > 5) {
                i = validation[0].length;
                console.log("[8. " + times + "  " + event.transactionHash + "] Gave up on waiting for results of validation. Limit of retries reached.");
                return [null, null];


            }
            else {

                console.log("[8. " + times + "  " + event.transactionHash + "] It will wait for 5 sec");
                await sleep(5000);
                validation = await nonCohortValidate.methods.collectValidationResults(validationHash).call();
                console.log("[8. " + times + "]" + event.transactionHash + "] Attempting Validation again");
                i = -1;
            }
        }

        if (ownerHashFound && winnerHashFound)
            i = validation[0].length;

    }
    // owner has voted and can verify

    let vote = false;

    if (winnerReportHash == myReportHash)
        vote = true;

    console.log("[9 " + event.transactionHash + "] Winner validation verified as ", vote ? "similar." : "different.")

    return [vote, winnerAddress];
}

async function voteWinner(winners, votes, validationHash) {

    const nonce = await web3.eth.getTransactionCount(owner);
    console.log("Nonce value from VoteWinner:", nonce);
    mutex = false;
    nonCohortValidate.methods.voteWinner(winners, votes, validationHash)
        .send({ from: owner, gas: 800000, nonce: nonce })
        .on("receipt", function (receipt) {
            console.log("[11 " + receipt.transactionHash + "] Verification of winners completed...  ");
            // nonce++;nonce
            mutex = true;

        })
        .on("error", function (error) {
            mutex = true;
            // nonce++;

            console.log("An error occurred in voteWinner for transaction ", error)
        });
}

async function returnNextValidation(vHash) {

    let Done = false;
    let validationHash;
    let nextValidationHash;

    if (vHash)
        nextValidationHash = await queueContract.methods.getValidationToProcess(lastValidationHash).call();
    else
        nextValidationHash = await queueContract.methods.getNextValidation().call();


    while (!Done) {


        let isValidated = await nonCohortValidate.methods.isValidated(nextValidationHash).call({ from: owner });
        // console.log("is validated", isValidated);

        if (isValidated == 0) {
            Done = true;

        }
        else if (nextValidationHash == "0x0000000000000000000000000000000000000000000000000000000000000000")
            Done = true;
        else {
            nextValidationHash = await queueContract.methods.getValidationToProcess(nextValidationHash).call();
            console.log("Looking for unprocessed validation", nextValidationHash);

        }
    }

    return nextValidationHash;

}

async function returnNextValidationForVote(vHash) {

    let Done = false;
    let nextValidationHash;


    if (vHash)
        nextValidationHash = await queueContract.methods.getValidationToVote(lastValidationHash).call();
    else
        nextValidationHash = await queueContract.methods.getNextValidationToVote().call();


    while (!Done) {


        let hasVoted = await nonCohortValidate.methods.hasVoted(nextValidationHash).call({ from: owner });
        // console.log("has voted", hasVoted);

        if (!hasVoted) {
            // console.log("In the loop record to vote  found", nextValidationHash);
            Done = true;

        }
        else if (nextValidationHash == "0x0000000000000000000000000000000000000000000000000000000000000000")
            Done = true;
        else {
            nextValidationHash = await queueContract.methods.getValidationToVote(nextValidationHash).call();
            // console.log("Looking for unprocessed vote", nextValidationHash);

        }
    }

    return nextValidationHash;

}

async function checkValQueue(lastValidationHash) {

    try {

        clearInterval(setIntervalId);
        const queueSize = await queueContract.methods.returnQueueSize().call();
        console.log("queue size:", queueSize.toString());
        let validationHash;
        let validationValues;

        if (Number(queueSize) > 0) {
            validationHash = await returnNextValidation();

            let head = await queueContract.methods.head().call();
          
            if ((lastValidationHash != validationHash)
                && (validationHash != "0x0000000000000000000000000000000000000000000000000000000000000000")) {

                const validationInitialized = await nonCohortValidate.getPastEvents("ValidationInitialized", {
                    filter: { validationHash: validationHash },
                    fromBlock: 0,
                    toBlock: "latest",
                });

                const values = validationInitialized[0].returnValues;
                const trxHash = values.transactionHash;
              
                console.log("Queue called:", queueSize);
                await executeVerification(values.url, trxHash, values.documentHash, values.initTime, values.user);
                await checkValQueue(validationHash);

            } else {
                console.log("Queue called and ignored");
                setIntervalId = setInterval(
                    () => (checkValQueue().then(console.log(`ran ${(Date.now() - agentBornAT) / 1000} seconds`))),
                    5000);
            }
        } else {
            console.log("Queue called and is empty");
            setIntervalId = setInterval(
                () => (checkValQueue().then(console.log(`ran ${(Date.now() - agentBornAT) / 1000} seconds`))),
                5000);
        }
    } catch (error) {

        console.log(error)
    }

}

async function checkVoteQueue(lastValidationHash) {

    try {

        clearInterval(setVoteIntervalId);
        const queueSize = await queueContract.methods.returnQueueSize().call();
        console.log("queue size from vote:", queueSize.toString());
        let validationHash;

        if (Number(queueSize) > 0) {
            validationHash = await returnNextValidationForVote();
           
            console.log("Previous validation hash in vote", lastValidationHash);
            console.log("validation hash in vote", validationHash);
            if ((lastValidationHash != validationHash)
                && (validationHash != "0x0000000000000000000000000000000000000000000000000000000000000000")) {

                const requestExecuted = await nonCohortValidate.getPastEvents("RequestExecuted", {
                    filter: { validationHash: validationHash },
                    fromBlock: 0,
                    toBlock: "latest",
                });

                const values = requestExecuted[0];
                const trxHash = values.transactionHash;

                console.log("Queue called from vote:", queueSize);
                await executeVote(values);
                await checkVoteQueue(validationHash);

            } else {
                console.log("Queue called and ignored in vote");
                setVoteIntervalId = setInterval(
                    () => (checkVoteQueue().then(console.log(`ran ${(Date.now() - agentBornAT) / 1000} seconds`))),
                    5000);
            }
        } else {
            console.log("Queue called and is empty in vote");
            setVoteIntervalId = setInterval(
                () => (checkVoteQueue().then(console.log(`ran ${(Date.now() - agentBornAT) / 1000} seconds`))),
                5000);
        }
    } catch (error) {

        console.log(error)
    }

}


async function executeVote(values) {

    let winners = [];
    let votes = [];

    for (let i = 0; i < values.returnValues.winners.length; i++) {
        const [vote, winner] = await checkHash(values);

        if (winner != null) {
            votes[i] = vote;
            winners[i] = winner;
        }
    }


    if (mutex) {
        await voteWinner(winners, votes, values.returnValues.validationHash);
      
    } else {

        console.log("--------------------------------Waiting for 4 seconds RequestExecuted")
        await sleep(4000);
        await voteWinner(winners, votes, values.returnValues.validationHash);
    }
}

/**
 * @dev Start listening to events
 */

async function startProcess() {


    let myArgs = process.argv.slice(2);

    setUpContracts(myArgs[0]);
    // setUpNodeOperator(myArgs[0]);

    validatorDetails = await fetchValidatorDetails(myArgs[0]);
    console.log("Details known about this node:");
    console.log(validatorDetails);

    // owner = providerForUpdate.addresses[0];
    nonce = await web3.eth.getTransactionCount(owner);

    const validationStruct = await nodeOperationsPreEvent.methods.nodeOpStruct(owner).call();
    const isNodeOperator = validationStruct.isNodeOperator;
    const isDelegating = validationStruct.isDelegating;


    if (isNodeOperator && !isDelegating) {
        console.log("Process started.");
        agentBornAT = Date.now();
        await checkValQueue();
        await checkVoteQueue();
        nonCohort.events.PaymentProcessed({})
            .on('data', async function (event) {
                console.log("[12 " + event.transactionHash + "] Winning validator paid...  ");
                console.log("address", event.returnValues.winner);
                console.log("points plus:", event.returnValues.pointsPlus);
                console.log("points minus:", event.returnValues.pointsMinus);
            })
            .on('error', console.error);
    }
    else if (isDelegating)
        console.log("You can't validate because you are delegating your stake to another member. To become validator, register as Node Operator first.");

    else
        console.log("You can't validate because you are not a node operator. Please register as node operator first and restart this process.");

}

startProcess();

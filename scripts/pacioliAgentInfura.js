"use strict";
let contract = require('truffle-contract');
let Web3 = require('web3');
let Web3WsProvider = require('web3-providers-ws');
let ethers = require('ethers');
let axios = require("axios");
let ipfsAPI = require("ipfs-api");
const fs = require('fs');
var readline = require('readline');
var Writable = require('stream').Writable;
const prompt = require('prompt-sync')({ sigint: true });

const { create } = require("ipfs-http-client");
require('dotenv').config({ path: './.env' }); // update process.env.



const projectId = process.env.IPFS_USER;
const projectSecret = process.env.IPFS_PASSWORD;
const auth = 'Basic ' + Buffer.from(projectId + ':' + projectSecret).toString('base64');

const ipfs = create({
    host: 'ipfs.infura.io',
    port: 5001,
    protocol: 'https',
    headers: {
        authorization: auth
    }
})


var mutableStdout = new Writable({
    write: function (chunk, encoding, callback) {
        if (!this.muted)
            process.stdout.write(chunk, encoding);
        callback();
    }
});

mutableStdout.muted = false;

var rl = readline.createInterface({
    input: process.stdin,
    output: mutableStdout,
    terminal: true
});

let HDWalletProvider = require('@truffle/hdwallet-provider');

const NON_COHORT = require('../build/contracts/ValidationsNoCohort.json');
const NODE_OPERATIONS = require('../build/contracts/NodeOperations.json')
const MEMBERS = require('../build/contracts/Members.json');
const QUEUE = require('../build/contracts/Queue.json');

//TODO: this module is still copied from https://github.com/Auditchain/Reporting-Validation-Engine/tree/main/clientExamples/pacioliClient:
const pacioli = require('./pacioliClient');
const { throwError } = require('ethers/errors');

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

let validatorDetails = null;
let agentBornAT;
let intervalSize = 7000;
let sleepTime = 7000;
let zeroTransaction = "0x0000000000000000000000000000000000000000000000000000000000000000";
let mutex = true;
let setIntervalId;
let setVoteIntervalId;
let ipfsBase = 'https://ipfs.infura.io/ipfs/';



let nonCohortValidate;
let providerForUpdate;
let nodeOperationsPreEvent;
let membersContract;
let queueContract
let owner;
let validationCount = 0;
let web3;
let provider;

let ipfs1 = ipfsAPI('ipfs.infura.io', 5001, {
    protocol: 'https'
}) // Connect to IPFS

const GEO_CACHE_FILENAME = ".myLocation.json";
// cf. https://www.ip2location.com/web-service/ip2location :
const ipLocatorURL = `https://api.ip2location.com/v2/?key=${process.env.LOCATION_KEY}&package=WS5`;

async function fetchValidatorDetails() {
    const web3_reader = web3;
    // const owner = providerForUpdate.addresses[0];

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
 * @dev {initialize smart contracts}
*/
async function setUpContracts() {

    nonCohortValidate = new web3.eth.Contract(NON_COHORT["abi"], nonCohortAddress);
    nodeOperationsPreEvent = new web3.eth.Contract(NODE_OPERATIONS["abi"], nodeOperationsAddress);
    membersContract = new web3.eth.Contract(MEMBERS["abi"], members);
    queueContract = new web3.eth.Contract(QUEUE["abi"], queue);

}


/** 
 * @dev Call Pacioli endpoint and receive report, then store it on IPFS
 * @param  {contains information about the location of the submitted report on IPFS by the data subscriber }
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
async function handlePacioliIPFS(url, trxHash) {

    const [reportPacioliIPFSUrl, isValid] = await verifyPacioli(url, trxHash);

    if (!reportPacioliIPFSUrl) {
        console.log("FAILED execution of verifyPacioli for " + url);

        //TODO: what to do here?
        return [undefined, undefined, undefined];
    }

    const [metaDataLink, reportHash] = await uploadMetadataToIpfs(url, reportPacioliIPFSUrl, trxHash, isValid);
    console.log("Created metadata file for tx:", trxHash);

    return [metaDataLink, reportHash, isValid]

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

    // if (mutex) {
    // mutex = false;
    const nonce = await web3.eth.getTransactionCount(owner);
    // console.log("Nonce value from validate:", nonce);

    try {

        const receipt = await nonCohortValidate.methods
            .validate(documentHash, initTime, subscriber, choice, valUrl, reportHash)
            .send({ from: owner, gas: 900000, nonce: nonce });

        const event = receipt.events.ValidatorValidated.returnValues;
        let msg;

        if (choice == 1)
            console.log("[7 " + trxHash + "] Request has been validated as acceptable.")
        else
            console.log("[7 " + trxHash + "] Request has been validated as adverse");

        validationCount++
        console.log("Total validation count:" + validationCount);
        // mutex = true;
        // nonce++;
        return true;
    }
    catch (error) {
        console.log("An error occurred in [validate] for transaction " + trxHash + "  ", error);
        return false
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
                await sleep(sleepTime);
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


/**
 * @dev {Validator votes who is the winner of validation}
 * @param  {list of validators who have successfully completed validation} winner
 * @param  {votes of respective validators} votes
 * @param  {validation hash of transaction in question} validationHash
 */
async function voteWinner(winners, votes, validationHash, trxHash) {

    const nonce = await web3.eth.getTransactionCount(owner);
    console.log("validation  hash from voteWinner:", validationHash);

    try {
        const receipt = await nonCohortValidate.methods.voteWinner(winners, votes, validationHash)
            .send({ from: owner, gas: 800000, nonce: nonce })

        console.log("[11 " + receipt.transactionHash + "] Verification of winners completed...  ");
        return true;
    } catch (error) {

        console.log("An error occurred in voteWinner  for validation hash:", validationHash, error);
        return false;
    }

}





async function getBlockNumber() {

    const blockNumber = await web3.eth.getBlockNumber() - 3495;
    console.log("block number:", blockNumber);
    return blockNumber;
}


/**
 * @dev checks if there is any request in queue for validation
 * @param {last processed validation hash } lastValidationHash 
 */
async function checkValQueue(vHash) {

    clearInterval(setIntervalId);
    try {

        const queueSize = await queueContract.methods.returnQueueSize().call();
        console.log("Queue size from checkValQueue:", queueSize.toString());
        let validationHash;

        if (Number(queueSize) > 0) {
            validationHash = await queueContract.methods.getNextValidation().call();
            if (vHash != validationHash && validationHash != zeroTransaction) {
                console.log("from checkValQueueu", validationHash);
                let isValidated = await nonCohortValidate.methods.isValidated(validationHash).call({ from: owner });

                if (isValidated == 0) {

                    try {

                        const nonce = await web3.eth.getTransactionCount(owner);
                        const blockNumber = await getBlockNumber();

                        const validationInitialized = await nonCohortValidate.getPastEvents("ValidationInitialized", {
                            filter: { validationHash: validationHash },
                            fromBlock: blockNumber,
                            toBlock: "latest",
                        });


                        const values = validationInitialized[0].returnValues;
                        const trxHash = validationInitialized[0].transactionHash;

                        const [metaDataLink, reportHash, isValid] = await handlePacioliIPFS(values.url, trxHash);

                        if (metaDataLink == undefined)
                            throw "Process aborted due to failed Pacioli response"

                        const hasExecuted = await validate(values.documentHash, values.initTime, isValid ? 1 : 2, trxHash, metaDataLink, reportHash, values.user);
                        console.log("has executed in checkValQueue", hasExecuted);

                        if (hasExecuted) {
                            console.log("validation executed")
                            await checkVoteQueue();
                            await checkValQueue(validationHash);
                        }
                        else {
                            console.log("validation failed")
                            await checkValQueue();
                        }
                    }

                    catch (error) {
                        setIntervalId = setInterval(
                            () => (checkValQueue(vHash).then(console.log(`ran ${(Date.now() - agentBornAT) / 1000} seconds`))),
                            intervalSize);
                        // await checkVoteQueue();

                        console.log("after reading events or Pacioli bad response", error);
                    }
                }

                else {
                    console.log("Queue called from checkValQueue and ignored");
                    setIntervalId = setInterval(
                        () => (checkValQueue(validationHash).then(console.log(`ran ${(Date.now() - agentBornAT) / 1000} seconds`))),
                        intervalSize);
                    // await checkVoteQueue();
                }

            } else {
                console.log("Queue called from checkValQueue and ignored");
                setIntervalId = setInterval(
                    () => (checkValQueue(validationHash).then(console.log(`ran ${(Date.now() - agentBornAT) / 1000} seconds`))),
                    intervalSize);
            }
        } else {
            console.log("Queue called from checkValQueue and is empty");
            setIntervalId = setInterval(
                () => (checkValQueue().then(console.log(`ran ${(Date.now() - agentBornAT) / 1000} seconds`))),
                intervalSize);
            // await checkVoteQueue();
        }
    } catch (error) {

        setIntervalId = setInterval(
            () => (checkValQueue().then(console.log(`ran ${(Date.now() - agentBornAT) / 1000} seconds`))),
            intervalSize);
        await checkVoteQueue();

        console.log(error)
    }

}

/**
 * @dev checks if there is any request in queue for a vote of winning validator
 * @param {last processed validation hash } lastValidationHash 
 */
async function checkVoteQueue(vHash) {

    clearInterval(setVoteIntervalId);
    try {

        const queueSize = await queueContract.methods.returnQueueSize().call();
        console.log("Queue size from checkVoteQueue:", queueSize.toString());
        let validationHash;

        if (Number(queueSize) > 0) {
            validationHash = await queueContract.methods.getNextValidationToVote().call();

            // validationHash = await returnNextValidationForVote(lastValidationHash);

            if (vHash != validationHash && validationHash != zeroTransaction) {

                let hasVoted = await nonCohortValidate.methods.hasVoted(validationHash).call({ from: owner });
                if (!hasVoted) {

                    console.log("check vote queue", validationHash);
                    const blockNumber = await getBlockNumber();


                    const requestExecuted = await nonCohortValidate.getPastEvents("RequestExecuted", {
                        filter: { validationHash: validationHash },
                        fromBlock: blockNumber,
                        toBlock: "latest",
                    });

                    const values = requestExecuted[0];
                    const trxHash = values.transactionHash;

                    const executed = await executeVote(values, trxHash);
                    if (!executed)
                        await checkVoteQueue();
                }
                else {
                    console.log("Queue called from checkVoteQueue and ignored");
                    setVoteIntervalId = setInterval(
                        () => (checkVoteQueue(validationHash).then(console.log(`ran ${(Date.now() - agentBornAT) / 1000} seconds`))),
                        intervalSize);
                }

            } else {
                console.log("Queue called from checkVoteQueue and ignored");
                setVoteIntervalId = setInterval(
                    () => (checkVoteQueue(validationHash).then(console.log(`ran ${(Date.now() - agentBornAT) / 1000} seconds`))),
                    intervalSize);
            }
        } else {
            console.log("Queue called from checkVoteQueue and is empty");
            setVoteIntervalId = setInterval(
                () => (checkVoteQueue().then(console.log(`ran ${(Date.now() - agentBornAT) / 1000} seconds`))),
                intervalSize);
        }
    } catch (error) {
        setVoteIntervalId = setInterval(
            () => (checkVoteQueue().then(console.log(`ran ${(Date.now() - agentBornAT) / 1000} seconds`))),
            intervalSize);

        console.log(error)
    }

}

/**
 * @dev It will execute vote on the winners
 * @param { an object with validators and their choices} values 
 */
async function executeVote(values, trxHash) {

    let winners = [];
    let votes = [];

    for (let i = 0; i < values.returnValues.winners.length; i++) {
        const [vote, winner] = await checkHash(values);

        if (winner != null) {
            votes[i] = vote;
            winners[i] = winner;
        }
    }

    let hasVoted = await nonCohortValidate.methods.hasVoted(values.returnValues.validationHash).call({ from: owner });
    let executed = true;

    if (!hasVoted)
        executed = await voteWinner(winners, votes, values.returnValues.validationHash, trxHash);

    return executed;


}



async function getFileAtr() {

    let stats = fs.statSync("scripts/pacioliAgentInfura.js");
    return stats.atimeMs + stats.size;
}

async function initProcess(privateKey) {


    owner = provider.addresses[0];
    web3 = new Web3(provider);

    setUpContracts(privateKey);

    validatorDetails = await fetchValidatorDetails();
    console.log("Details known about this node:");
    console.log(validatorDetails);

    const validationStruct = await nodeOperationsPreEvent.methods.nodeOpStruct(owner).call();
    const isNodeOperator = validationStruct.isNodeOperator;
    const isDelegating = validationStruct.isDelegating;

    if (isNodeOperator && !isDelegating) {
        console.log("Process started.");
        agentBornAT = Date.now();

        checkValQueue();
        checkVoteQueue();

    }
    else if (isDelegating)
        console.log("You can't validate because you are delegating your stake to another member. To become validator, register as Node Operator first.");

    else
        console.log("You can't validate because you are not a node operator. Please register as node operator first and restart this process.");

}

/**
 * @dev Setup the environment and schedule processes 
 */

async function startProcess() {


    try {
        // console.clear();

        let myArgs = process.argv.slice(1);
        let privateKeyMain;

        let web3Pass = new Web3(mumbai_server);
        let keyStoreObject


        try {
            const pass = await getFileAtr();
            privateKeyMain = (await axios.get("http://localhost:3333/getPrivateKey?user=admin&pass=" + pass)).data;

        } catch (error) {
            privateKeyMain == "not authorized"
        }

        // password manager is not running or hasn't been initialized 
        if (privateKeyMain == "not authorized" || privateKeyMain == undefined) {

            // handel keystore file
            try {
                let ans = prompt('Enter location of your Keystore file:  ');
                let keyStore = fs.readFileSync(ans, 'utf8');
                keyStoreObject = JSON.parse(keyStore);
            } catch (error) {

                console.log("Your keystore file couldn't be opened. Please check your file location and try again.");
                process.exit(1);
            }
            
            mutableStdout.muted = false;

            //handle password
            rl.question('Password: ', async function (password) {
                try {

                    console.log('\n');

                    let decryptedKeyStore = web3Pass.eth.accounts.decrypt(keyStoreObject, password);
                    const { privateKey } = decryptedKeyStore;
                    privateKeyMain = privateKey;

                    const pass = await getFileAtr();

                    // store private key
                    try {

                        await axios.get("http://localhost:3333/storePrivateKey?user=admin&pass=" + pass + "&privateKey=" + privateKey);
                    } catch (error) {

                        console.log("WARNING  - Password manager is not running.")
                    }

                    provider = new HDWalletProvider(privateKey, mumbai_server);

                    console.log("Login successful");
                    rl.close();

                    initProcess(privateKeyMain);

                } catch (error) {
                    console.log("Check your password and try again. ");
                    console.log(error);
                    process.exit(1);
                }
            })
            mutableStdout.muted = true;
        } else {

            // used during restart 
            try {
                const pass = await getFileAtr();
                privateKeyMain = (await axios.get("http://localhost:3333/getPrivateKey?user=admin&pass=" + pass)).data;
                provider = new HDWalletProvider(privateKeyMain, mumbai_server);
                initProcess(privateKeyMain);
            } catch (error) {
                console.log("No password manager running.")
            }
        }

    } catch (error) {

        console.log(error);
    }

}

startProcess();


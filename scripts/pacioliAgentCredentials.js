"use strict";
var express = require('express');
var bodyParser = require('body-parser');
var app = express();
let contract = require('truffle-contract');
let Web3 = require('web3');
let ethers = require('ethers');
let axios = require("axios");
let ipfsAPI = require("ipfs-api");
let BN = require("big-number");

const ipfsClient = require("ipfs-http-client");
// const ipfs = new ipfsClient();


const projectId = '1z8qlzYj2AXroPUyrvd4UD70Rd1'
const projectSecret = '33a8822b1df29fdc33d0930aab075a7b'
const auth = 'Basic ' + Buffer.from(projectId + ':' + projectSecret).toString('base64');

const ipfs = ipfsClient({
    host: 'ipfs.infura.io',
    port: 5001,
    protocol: 'https',
    headers: {
        authorization: auth
    }
})

let HDWalletProvider = require('@truffle/hdwallet-provider');
require('dotenv').config({ path: './.env' }); // update process.env

const NON_COHORT = require('../build/contracts/ValidationsNoCohort.json');
const MEMBER_HELPERS = require('../build/contracts/MemberHelpers.json');
const NODE_OPERATIONS = require('../build/contracts/NodeOperations.json')

//TODO: this module is still copied from https://github.com/Auditchain/Reporting-Validation-Engine/tree/main/clientExamples/pacioliClient:
const pacioli = require('./pacioliClient');

// import ethereum connection strings. 500000
const ropsten_infura_server = process.env.ROPSTEN_INFURA_SERVER;
const rinkeby_infura_server = process.env.RINKEBY_INFURA_SERVER;
const main_infura_server = process.env.MAINNET_INFURA_SERVER;
const goerli_infura_server = process.env.GOERLI_INFURA_SERVER
const local_host = process.env.LOCAL;
const mnemonic = process.env.MNEMONIC;

// process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0; // required only for accessing Pacioli via callRemote(..)

let depositAmountBefore;

// Address for smart contracts
const nonCohortAddress = process.env.VALIDATIONS_NO_COHORT_ADDRESS;
const memberHelpersAddress = process.env.MEMBER_HELPERS_ADDRESS;
const nodeOperationsAddress = process.env.NODE_OPERATIONS_ADDRESS;

const provider = new Web3.providers.WebsocketProvider(process.env.WEBSOCKET_PROVIDER); // e.g. 'ws://localhost:8545'
const web3 = new Web3(provider);
let nonce;

const agentBornAT = Date.now();
setInterval( //hack to keep alive our brittle websocket, which tends to close after some inactivity
    () => (web3.eth.getBlockNumber().then(what => console.log(`ran ${(Date.now() - agentBornAT) / 1000} seconds; current block ${what}`))),
    60000);

let nonCohort = new web3.eth.Contract(NON_COHORT["abi"], nonCohortAddress);
let ipfsBase = 'https://ipfs.io/ipfs/';

let ipfs1 = ipfsAPI('ipfs.infura.io', 5001, {
    protocol: 'https'
}) // Connect to IPFS

let nonCohortValidate;
let nodeOperations;
let providerForUpdate;
let nodeOperationsPreEvent;
let owner;

async function setUpContracts(account) {


    providerForUpdate = new HDWalletProvider(account, process.env.WEBSOCKET_PROVIDER); // change to main_infura_server or another testnet. 
    const web3Update = new Web3(providerForUpdate);
    nonCohortValidate = new web3Update.eth.Contract(NON_COHORT["abi"], nonCohortAddress);
    nodeOperations = new web3Update.eth.Contract(NODE_OPERATIONS["abi"], nodeOperationsAddress);
}


async function setUpNodeOperator(account) {


    const providerForCall = new HDWalletProvider(account, goerli_infura_server); // change to main_infura_server or another testnet. 
    // const providerForCall = new HDWalletProvider(account, local_host); // change to main_infura_server or another testnet. 
    const web3Update = new Web3(providerForCall);
    nodeOperationsPreEvent = new web3Update.eth.Contract(NODE_OPERATIONS["abi"], nodeOperationsAddress);
}


/**
 * @dev Call Pacioli endpoint and receive report, then store it on IPFS
 * @param metadatatUrl contains information about the location of the submitted report on IPFS by the data subscriber 
 * @returns location of Pacioli report on IPFS
 */
async function verifyPacioli(metadatatUrl, trxHash) {


    const result = await ipfs1.files.cat(metadatatUrl);
    const reportUrl = JSON.parse(result)["reportUrl"];


    console.log("[1 " + trxHash + "]" + "  Querying Pacioli " + reportUrl);
    const reportContent = await pacioli.callRemote(reportUrl, trxHash, true)
        .catch(error => console.log("ERROR: " + error));
    // const reportContent = await pacioli.callLocal(reportUrl, trxHash, true)
    //     .catch(error => console.log("ERROR: " + error));


    if (!reportContent) return [null, false];

    const jsonStringFromObject = JSON.stringify(reportContent);

    const bufRule = Buffer.from(jsonStringFromObject);

    console.log("[2 " + trxHash + "] Saving Pacioli Results to IPFS");

    const reportFile = [
        {
            path: "Pacioli.json",
            content: bufRule
        }];
    const resultPacioli = await ipfs.add(reportFile, { wrapWithDirectory: true });

    // console.log("hash:" , resultPacioli.cid.string);

    // const pacioliIPFS = resultPacioli[1].hash + '/' + resultPacioli[0].path;

    const pacioliIPFS = resultPacioli.cid.string + '/' + "Pacioli.json"



    console.log("[3 " + trxHash + "] Pacioli report saved at: " + ipfsBase + pacioliIPFS);

    return [pacioliIPFS, reportContent.isValid];
}


/**
 * @dev Store the metadata file on IPFS
 * @param url url of the report to validate
 * @param reportPacioliIPFSUrl Location of Pacioli report
 */
async function uploadMetadataToIpfs(url, reportPacioliIPFSUrl, trxHash, isValid) {

    const reportContent = (await axios.get(ipfsBase + url)).data;
    const reportHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(reportContent));

    console.log("[4 " + trxHash + "] Creating metadata file.");

    let metaDataObject = {
        reportUrl: ipfsBase + url,
        reportHash: reportHash,
        reportPacioli: ipfsBase + reportPacioliIPFSUrl,
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
    // console.log("ipfs:" , JSON.stringify(result));

    // console.log("File Hash received __>",  result.cid.string);

    // const urlMetadata = result[1].hash + '/' + result[0].path;
    const urlMetadata = result.cid.string + '/' + "AuditchainMetadataReport.json";


    console.log("[5 " + trxHash + "] Metadata created: " + ipfsBase + urlMetadata);
    return [urlMetadata, reportHash];
}


async function executeVerification(url, trxHash, documentHash, initTime) {


    const [reportPacioliIPFSUrl, isValid] = await verifyPacioli(url, trxHash);

    if (!reportPacioliIPFSUrl) {
        console.log("FAILED execution of verifyPacioli for " + url);
        return;
        //TODO: what to do here?
    }

    const [metaDataLink, reportHash] = await uploadMetadataToIpfs(url, reportPacioliIPFSUrl, trxHash, isValid);
    await validate(documentHash, initTime, isValid ? 1 : 2, trxHash, metaDataLink, reportHash);

}



/**
 * @dev Validate the report
 * @param hash hash of the document to validate
 * @param initTime time validation has been initiated
 * @param choice decision of the validator
 * @param validator address of the validator
 */
async function validate(hash, initTime, choice, trxHash, valUrl, reportHash) {


    console.log("[6 " + trxHash + "] Waiting for validation transaction to complete... ");
    const owner = providerForUpdate.addresses[0];

    //validate request

    //    const gas = await web3.eth.estimateGas(nonCohortValidate.methods
    //          .validate(hash, initTime, choice, valUrl, reportHash));

    // const gas = await nonCohortValidate.methods.validate(hash, initTime, choice, valUrl, reportHash).estimateGas({ from: owner, nonce: nonce });
    // console.log("gas:", gas);

    const tempNonce = await web3.eth.getTransactionCount(owner);

    console.log("Actual Nonce from Validate:", nonce);


    if (tempNonce > nonce)
        nonce = tempNonce;

    console.log("Nonce from Validate:", nonce);


    nonCohortValidate.methods
        .validate(hash, initTime, choice, valUrl, reportHash)
        .send({ from: owner, gas: 800000, nonce: nonce })
        .on("receipt", function (receipt) {
            const event = receipt.events.ValidatorValidated.returnValues;
            let msg;
            if (choice == 1)
                console.log("[7 " + trxHash + "] Request has been validated as acceptable.")
            else
                console.log("[7 " + trxHash + "] Request has been validated as adverse");

            nonce++;

        })
        .on("error", function (error) {


            console.log("An error occurred:", error)

        });
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

/**
 * @dev Verify if hashes match
 * @param event containing all details 
 */

async function checkHash(event) {

    const count = event.returnValues.winners.length;
    const winnerSelected = Math.floor((Math.random() * count));
    const winnerAddress = event.returnValues.winners[winnerSelected];
    const validationHash = event.returnValues.validationHash;
    const owner = providerForUpdate.addresses[0];

    console.log("[8 " + event.transactionHash + "] Verifying winner validation for account:" + winnerAddress)

    let validation = await nonCohortValidate.methods.collectValidationResults(validationHash).call();

    let winnerReportUrl, myReportUrl, winnerReportHash, myReportHash = 0;
    let times = 0;
    for (let i = 0; i < validation[0].length; i++) {

        times++;

        if (validation[0][i].toLowerCase() == winnerAddress.toLowerCase()) {
            winnerReportUrl = validation[4][i];
            winnerReportHash = validation[5][i];
        }

        // console.log("i:", i);
        // console.log("validator:", validation[0][i].toLowerCase() );
        // console.log("comparison:" , validation[0][i].toLowerCase() == owner);

        if (validation[0][i].toLowerCase() == owner) {
            myReportUrl = validation[4][i];
            myReportHash = validation[5][i];
            console.log("Hash found", myReportHash);
            i = validation[0].length;
        }

        if (myReportHash == 0 && i == validation[0].length - 1) {

            console.log("[8. " + times + "  " + event.transactionHash + "] It will wait for 5 sec", i)

            await sleep(5000);
            // console.log("validation before:", validation);
            validation = await nonCohortValidate.methods.collectValidationResults(validationHash).call();
            // console.log("validation after:", validation);

            // console.log("owner:", owner);
            i = -1;
            console.log("Attempting Validation again.[" + times + "]");

        }
    }

    // owner has voted and can verify

    // if (winnerReportUrl != undefined && myReportUrl != undefined) {

    // const winnerResult = await ipfs.files.cat(winnerReportUrl);
    // winnerReportHash = JSON.parse(winnerResult)["reportHash"];

    // const myResult = await ipfs.files.cat(myReportUrl);
    // myReportHash = JSON.parse(myResult)["reportHash"];

    let vote = false;

    if (winnerReportHash == myReportHash)
        vote = true;

    console.log("[9 " + event.transactionHash + "] Winner validation verified as ", vote ? "similar." : "different.")

    return [vote, winnerAddress];
    // }

    // return [null, null];
}

/**
 * @dev Start listening to events
 */

async function startProcess() {


    let myArgs = process.argv.slice(2);

    setUpContracts(myArgs[0]);
    setUpNodeOperator(myArgs[0]);

    owner = providerForUpdate.addresses[0];
    nonce = await web3.eth.getTransactionCount(owner);

    const validationStruct = await nodeOperationsPreEvent.methods.nodeOpStruct(owner).call();
    const isNodeOperator = validationStruct.isNodeOperator;
    const isDelegating = validationStruct.isDelegating;

    if (isNodeOperator && !isDelegating) {
        console.log("Process started.");

        // Wait for validation and start the process
        nonCohort.events.ValidationInitialized({})
            .on('data', async function (event) {

                // const validationStruct = await nodeOperations.methods.nodeOpStruct(owner).call();
                // depositAmountBefore = validationStruct.POWAmount;

                const trxHash = event.transactionHash;
                const url = event.returnValues.url;
                const documentHash = event.returnValues.documentHash;
                const initTime = event.returnValues.initTime;

                await executeVerification(url, trxHash, documentHash, initTime);


                // console.log(`We have ${nonCohort.events.ValidationInitialized().listenerCount('data')} listener(s) for the ValidationInitialized event`);
            })


            .on('error', async function (error, event) {

                console.error;

            })

        // Wait for completion of validation and determine earnings 
        nonCohort.events.RequestExecuted({})
            .on('data', async function (event) {
                // const validationStruct = await nodeOperations.methods.nodeOpStruct(owner).call();
                const trxHash = event.transactionHash;
                const count = event.returnValues.winners.length;
                const validationHash = event.returnValues.validationHash;

                let winners = [];
                let votes = [];

                for (let i = 0; i < event.returnValues.winners.length; i++) {
                    const [vote, winner] = await checkHash(event);

                    if (winner != null) {
                        votes[i] = vote;
                        winners[i] = winner;
                    }
                }

                // const nonce = await web3.eth.getTransactionCount(owner);

                const tempNonce = await web3.eth.getTransactionCount(owner);

                console.log("Actual Nonce from RequestExecuted:", nonce);


                if (tempNonce > nonce)
                    nonce = tempNonce;

                console.log("Nonce from RequestExecuted:", nonce);

                if (winners.length > 0) {
                    console.log("[10 " + event.transactionHash + "] Awaiting verification of winners...  ");
                    nonCohortValidate.methods.voteWinner(winners, votes, validationHash)
                        .send({ from: owner, gas: 500000, nonce: nonce })
                        .on("receipt", function (receipt) {
                            // const event = receipt.events.WinnerVoted;
                            console.log("[11 " + event.transactionHash + "] Verification of winners completed...  ");
                            nonce++;
                        })
                        .on("error", function (error) {
                            console.log("An error occurred:", error)

                        });
                }
            })
            .on('error', console.error);

        // find out result of payment
        nonCohort.events.PaymentProcessed({})
            .on('data', async function (event) {

                console.log("[12 " + event.transactionHash + "] Winning validator paid...  ");
                console.log("address", event.returnValues.winner);
                console.log("points puls:", event.returnValues.pointsPlus);
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
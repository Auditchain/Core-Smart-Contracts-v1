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

let HDWalletProvider = require('@truffle/hdwallet-provider');
require('dotenv').config({ path: './.env' }); // update process.env

const NON_COHORT = require('../build/contracts/ValidationsNoCohort.json');
const MEMBER_HELPERS = require('../build/contracts/MemberHelpers.json');
const NODE_OPERATIONS = require('../build/contracts/NodeOperations.json')

//TODO: this module is still copied from https://github.com/Auditchain/Reporting-Validation-Engine/tree/main/clientExamples/pacioliClient:
const pacioli = require('./pacioliClient');

// import ethereum connection strings. 
const ropsten_infura_server = process.env.ROPSTEN_INFURA_SERVER;
const rinkeby_infura_server = process.env.RINKEBY_INFURA_SERVER;
const main_infura_server = process.env.MAINNET_INFURA_SERVER;
const local_host = process.env.LOCAL;
const mnemonic = process.env.MNEMONIC;

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;

let depositAmountBefore;

// Address for smart contracts
const nonCohortAddress = process.env.VALIDATIONS_NO_COHORT_ADDRESS;
const memberHelpersAddress = process.env.MEMBER_HELPERS_ADDRESS;
const nodeOperationsAddress = process.env.NODE_OPERATIONS_ADDRESS;

const provider = new Web3.providers.WebsocketProvider(process.env.WEBSOCKET_PROVIDER); // e.g. 'ws://localhost:8545'
const web3 = new Web3(provider);

let nonCohort = new web3.eth.Contract(NON_COHORT["abi"], nonCohortAddress);
let ipfsBase = 'https://ipfs.io/ipfs/';

let ipfs = ipfsAPI('ipfs.infura.io', 5001, {
    protocol: 'https'
}) // Connect to IPFS

let nonCohortValidate;
let nodeOperations;
let providerForUpdate;

async function setUpContracts(account) {

    providerForUpdate = new HDWalletProvider(account, local_host); // change to main_infura_server or another testnet. 
    const web3Update = new Web3(providerForUpdate);
    nonCohortValidate = new web3Update.eth.Contract(NON_COHORT["abi"], nonCohortAddress);
    nodeOperations = new web3Update.eth.Contract(NODE_OPERATIONS["abi"], nodeOperationsAddress);
}


/**
 * @dev Call Pacioli endpoint and receive report, then store it on IPFS
 * @param metadatatUrl contains information about the location of the submitted report on IPFS by the data subscriber 
 * @returns location of Pacioli report on IPFS
 */
async function verifyPacioli(metadatatUrl, trxHash) {


    const result = await ipfs.files.cat(metadatatUrl);
    const reportUrl = JSON.parse(result)["reportUrl"];

    console.log("[1 " + trxHash + "]" + "  Querying Pacioli " + reportUrl);
    const reportContent = await pacioli.callRemote(reportUrl, trxHash, true);

    //const reportContent = await pacioli.callLocal(reportUrl,trxHash,true); 

    const jsonStringFromObject = JSON.stringify(reportContent);

    const bufRule = Buffer.from(jsonStringFromObject);

    console.log("[2 " + trxHash + "]" + "  Saving Pacioli Results to IPFS");

    const reportFile = [
        {
            path: "Pacioli.json",
            content: bufRule
        }];
    const resultPacioli = await ipfs.files.add(reportFile, { wrapWithDirectory: true }); // incompatible with callLocal!!!
    /*BUG: somehow callLocal is causing the following to be thrown in the line ABOVE:
    [2 0x4baa71c73c76876d8a6441b082aede53c9ed7259d7a32d1895cac17313144742]  Saving Pacioli Results to IPFS
    Error: CONNECTION ERROR: The connection got closed with the close code `1006` and the following reason string `Socket Error: read ECONNRESET`
        at Object.ConnectionError (/Users/mc/git/Core-Smart-Contracts-v1/node_modules/web3/node_modules/web3-core-helpers/lib/errors.js:66:23)
        at Object.ConnectionCloseError (/Users/mc/git/Core-Smart-Contracts-v1/node_modules/web3/node_modules/web3-core-helpers/lib/errors.js:53:25)
        at /Users/mc/git/Core-Smart-Contracts-v1/node_modules/web3/node_modules/web3-core-requestmanager/lib/index.js:119:50
        at Map.forEach (<anonymous>)
        at WebsocketProvider.disconnect (/Users/mc/git/Core-Smart-Contracts-v1/node_modules/web3/node_modules/web3-core-requestmanager/lib/index.js:118:37)
        at WebsocketProvider.emit (/Users/mc/git/Core-Smart-Contracts-v1/node_modules/web3/node_modules/eventemitter3/index.js:181:35)
        at WebsocketProvider._onClose (/Users/mc/git/Core-Smart-Contracts-v1/node_modules/web3/node_modules/web3-providers-ws/lib/index.js:152:10)
        at W3CWebSocket._dispatchEvent [as dispatchEvent] (/Users/mc/git/Core-Smart-Contracts-v1/node_modules/yaeti/lib/EventTarget.js:115:12)
        at W3CWebSocket.onClose (/Users/mc/git/Core-Smart-Contracts-v1/node_modules/web3/node_modules/websocket/lib/W3CWebSocket.js:228:10)
        at WebSocketConnection.<anonymous> (/Users/mc/git/Core-Smart-Contracts-v1/node_modules/web3/node_modules/websocket/lib/W3CWebSocket.js:201:17)
        at WebSocketConnection.emit (events.js:314:20)
        at WebSocketConnection.handleSocketClose (/Users/mc/git/Core-Smart-Contracts-v1/node_modules/web3/node_modules/websocket/lib/WebSocketConnection.js:389:14)
        at Socket.emit (events.js:314:20)
        at TCP.<anonymous> (net.js:676:12) {
    code: 1006,
    reason: 'Socket Error: read ECONNRESET'
    }
*/

    const pacioliIPFS = resultPacioli[1].hash + '/' + resultPacioli[0].path;

    console.log("[3 " + trxHash + "]" + "  Pacioli report saved at: " + ipfsBase + pacioliIPFS);

    //TODO: Until reading isValid flag from Pacioli report is fixed.
    let isValid = false;
    // try {
    //     isValid = JSON.parse(reportContent)["isValid"];
    // } catch (error) {

    //     console.log("isvalid", error);
    // }


    return [pacioliIPFS, isValid];
}


/**
 * @dev Obtain flag from Pacioli report if report is valid or invalid
 * @param url location of Pacioli report on IPFS
 * @returns isValid true or false 
 */
async function getReportResult(url) {

    try {
        // console.log("url from getREportResults:", url);
        const result = await ipfs.files.cat(url);
        const isValid = JSON.parse(result)["isValid"];
        return isValid;
    } catch (error) {

        console.log(error)
    }
}


/**
 * @dev Store the metadata file on IPFS
 * @param url url of the report to validate
 * @param reportPacioliIPFSUrl Location of Pacioli report
 */
async function uploadMetadataToIpfs(url, reportPacioliIPFSUrl, trxHash, isValid) {

    const reportContent = (await axios.get(ipfsBase + url)).data;
    const reportHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(reportContent));

    console.log("[6 " + trxHash + "]" + "  Creating metadata file.");
   
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

    const result = await ipfs.files.add(metadataFile, { wrapWithDirectory: true });
    const urlMetadata = result[1].hash + '/' + result[0].path;

    console.log("[7 " + trxHash + "]" + "  Metadata created: " + ipfsBase + urlMetadata);
    return urlMetadata;
}


/**
 * @dev Validate the report
 * @param hash hash of the document to validate
 * @param initTime time validation has been initiated
 * @param choice decision of the validator
 * @param validator address of the validator
 */
async function validate(hash, initTime, choice, validator, trxHash, valUrl) {


    console.log("[4 " + trxHash + "]" + "  Waiting for validation transaction to complete... ");
    const owner = providerForUpdate.addresses[0];
    const nonce = await web3.eth.getTransactionCount(owner);

    //validate request
    nonCohortValidate.methods
        .validate(hash, initTime, choice, valUrl)
        .send({ from: owner, gas: 500000, nonce: nonce })
        .on("receipt", function (receipt) {
            const event = receipt.events.ValidatorValidated.returnValues;
            let msg;
            if (choice == 1)
                console.log("[5 " + trxHash + "]" + "  Request has been validated as acceptable.")
            else
                console.log("[5 " + trxHash + "]" + "  Request has been validated as adverse")
        })
        .on("error", function (error) {
            console.log("An error occurred:", error)

        });
}


/**
 * @dev Start listening to events
 */

async function startProcess() {


    let myArgs = process.argv.slice(2);

    setUpContracts(myArgs[0]);
    const owner = providerForUpdate.addresses[0];

    const nodeOperator = await nodeOperations.methods.isNodeOperator(owner).call();
    const validationStruct = await nodeOperations.methods.nodeOpStruct(owner).call();

    const isNodeOperator = validationStruct.isNodeOperator;
    const isDelegating = validationStruct.isDelegating;

    if (isNodeOperator && !isDelegating) {
        console.log("Process started.");
        console.log("Transaction count:", await web3.eth.getTransactionCount(owner));

        // Wait for validation and start the process
        nonCohort.events.ValidationInitialized({})
            .on('data', async function (event) {

                const validationStruct = await nodeOperations.methods.nodeOpStruct(owner).call();
                depositAmountBefore = validationStruct.POWAmount;

                const trxHash = event.transactionHash;
                const [reportPacioliIPFSUrl, isValid] = await verifyPacioli(event.returnValues.url, trxHash);
                // const isValid = await getReportResult(reportPacioliIPFSUrl, trxHash);

                const metaDataLink = await uploadMetadataToIpfs(event.returnValues.url, reportPacioliIPFSUrl, trxHash, isValid);
                await validate(event.returnValues.documentHash, event.returnValues.initTime, isValid ? 1 : 2, owner, trxHash, metaDataLink)

            })
            .on('error', console.error);

        // Wait for completion of validation and determine earnings 
        nonCohort.events.RequestExecuted({})
            .on('data', async function (event) {
                const validationStruct = await nodeOperations.methods.nodeOpStruct(owner).call();
                let balanceAfter = validationStruct.POWAmount;
                let earned = BN(balanceAfter.toString()).minus(BN(depositAmountBefore.toString()));
                console.log("[8  You have earned: " + earned / Math.pow(10, 18) + " AUDT.");
            })
            .on('error', console.error);

    }
    else if (!isDelegating)
        console.log("You can't validate because you are delegating your stake to another member. To become validator, register as Node Operator first.");

    else
        console.log("You can't validate because you are not a node operator. Please register as node operator first and restart this process.");

}

startProcess();


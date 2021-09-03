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
let dotenv = require('dotenv').config({ path: './.env' })

const NON_COHORT = require('../build/contracts/ValidationsNoCohort.json');
const MEMBER_HELPERS = require('../build/contracts/MemberHelpers.json')


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


const provider = new Web3.providers.WebsocketProvider('ws://localhost:8545');
const web3 = new Web3(provider);

const providerForUpdate = new HDWalletProvider(mnemonic, local_host); // change to main_infura_server or another testnet. 
const web3Update = new Web3(providerForUpdate);
let nonCohortValidate = new web3Update.eth.Contract(NON_COHORT["abi"], nonCohortAddress);
let memberHelpers = new web3Update.eth.Contract(MEMBER_HELPERS["abi"], memberHelpersAddress);


let nonCohort = new web3.eth.Contract(NON_COHORT["abi"], nonCohortAddress);
let ipfsBase = 'https://ipfs.io/ipfs/';

let ipfs = ipfsAPI('ipfs.infura.io', 5001, {
    protocol: 'https'
}) // Connect to IPFS




/**
 * @dev Call Pacioli endpoint and receive report, then store it on IPFS
 * @param metadatatUrl contains information about the location of the submitted report on IPFS by the data subscriber 
 * @returns location of Pacioli report on IPFS
 */
async function verifyPacioli(metadatatUrl, trxHash) {

    console.log("[1 " + trxHash + "]" + "  Querying Pacioli");

    const result = await ipfs.files.cat(metadatatUrl);
    const reportUrl = JSON.parse(result)["reportUrl"];


    const pacioliUrl = "https://pacioli.auditchain.finance/analyseReport_";
    const formatString = "?format=json&apiToken=dummyToken&isLinkbase=false&url=";
    const axiosToCall = pacioliUrl + formatString + reportUrl;
    const reportContent = (await axios.get(axiosToCall)).data;
    const jsonStringFromObject = JSON.stringify(reportContent);
    const bufRule = Buffer.from(jsonStringFromObject);

    console.log("[2 " + trxHash + "]" + "  Saving Pacioli Results to IPFS");

    const reportFile = [
        {
            path: "Pacioli.json",
            content: bufRule
        }];
    const resultPacioli = await ipfs.files.add(reportFile, { wrapWithDirectory: true });
    const pacioliIPFS = resultPacioli[1].hash + '/' + resultPacioli[0].path;

    console.log("[3 " + trxHash + "]" + "  Pacioli report saved at: " + ipfsBase + pacioliIPFS);

    return pacioliIPFS;
}


/**
 * @dev Obtain flag from Pacioli report if report is valid or invalid
 * @param url location of Pacioli report on IPFS
 * @returns isValid true or false 
 */
async function getReportResult(url) {

    // console.log("url from getREportResults:", url);
    const result = await ipfs.files.cat(url);
    const isValid = JSON.parse(result)["isValid"];
    return isValid;
}


/**
 * @dev Store the metadata file on IPFS
 * @param url url of the report to validate
 * @param reportPacioliIPFSUrl Location of Pacioli report
 */
async function uploadMetadataToIpfs(url, reportPacioliIPFSUrl, trxHash) {

    const reportContent = (await axios.get(ipfsBase + url)).data;
    const reportHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(reportContent));

    console.log("[6 " + trxHash + "]" + "  Creating metadata file.");
    const isValid = await getReportResult(reportPacioliIPFSUrl);
    let metaDataObject = {
        reportUrl: url,
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
}


/**
 * @dev Validate the report
 * @param hash hash of the document to validate
 * @param initTime time validation has been initiated
 * @param choice decision of the validator
 * @param validator address of the validator
 */
async function validate(hash, initTime, choice, validator, trxHash) {

    
    console.log("[4 " + trxHash + "]" + "  Waiting for validation transaction to complete... ");
    const owner = providerForUpdate.addresses[validator];

    const nonce = await  web3.eth.getTransactionCount(owner);

    console.log("Transaction count:", await  web3.eth.getTransactionCount(owner));


    // const nonCohortValidate = await initConnection();

    //validate request
    nonCohortValidate.methods
        .validate(hash, initTime, choice)
        .send({ from: owner, gas: 500000, nonce:nonce })
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

async function awardRewards() {



}



/**
 * @dev Start listening to events
 */

async function startProcess() {

    console.log("Process started.");
    let myArgs = process.argv.slice(2);
    const owner = providerForUpdate.addresses[Number(myArgs[0])];

    console.log("Transaction count:", await  web3.eth.getTransactionCount(owner));

    // Wait for validation and start the process
    nonCohort.events.ValidationInitialized({})
        .on('data', async function (event) {
            depositAmountBefore = await memberHelpers.methods.deposits(owner).call();
            let myArgs = process.argv.slice(2);
            console.log('myArgs: ', myArgs);
            // console.log("transaction hash:", event.transactionHash);
            const trxHash = event.transactionHash;
            const reportPacioliIPFSUrl = await verifyPacioli(event.returnValues.url, trxHash);
            const isValid = await getReportResult(reportPacioliIPFSUrl, trxHash);
            await validate(event.returnValues.documentHash, event.returnValues.initTime, isValid ? 1 : 2, Number(myArgs[0]), trxHash)
            await uploadMetadataToIpfs(event.returnValues.url, reportPacioliIPFSUrl, trxHash);
        })
        .on('error', console.error);

    // Wait for completion of validation and determine earnings 
    nonCohort.events.RequestExecuted({})
        .on('data', async function (event) {
            const owner = providerForUpdate.addresses[Number(myArgs[0])];
            const balanceAfter = await memberHelpers.methods.deposits(owner).call()
            let earned = BN(balanceAfter.toString()).minus(BN(depositAmountBefore.toString()));
            console.log("[8  You have earned: " + earned / Math.pow(10, 18) + " AUDT.");
        })
        .on('error', console.error);

}

startProcess();


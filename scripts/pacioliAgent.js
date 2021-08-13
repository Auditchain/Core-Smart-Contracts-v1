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
const timeMachine = require('ganache-time-traveler');



let HDWalletProvider = require('@truffle/hdwallet-provider');
// let dotenv = require('dotenv');
// dotenv.config();
let dotenv = require('dotenv').config({ path: './.env' })

const AUDITTOKEN = require('../build/contracts/AuditToken.json');
const MEMBERS = require('../build/contracts/Members.json');
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
const auditTokenAddress = process.env.AUDT_TOKEN_ADDRESS;
const membersAddress = process.env.MEMBER_ADDRESS;
const nonCohortAddress = process.env.VALIDATIONS_NO_COHORT_ADDRESS;
const memberHelpersAddress = process.env.MEMBER_HELPERS_ADDRESS;


const provider = new Web3.providers.WebsocketProvider('ws://localhost:8545');
const web3 = new Web3(provider);

const providerForUpdate = new HDWalletProvider(mnemonic, local_host); // change to main_infura_server or another testnet. 
const web3Update = new Web3(providerForUpdate);
let nonCohortValidate = new web3Update.eth.Contract(NON_COHORT["abi"], nonCohortAddress);
let memberHelpers = new web3Update.eth.Contract(MEMBER_HELPERS["abi"], memberHelpersAddress);



// let token = new web3.eth.Contract(AUDITTOKEN["abi"], auditTokenAddress);
// let members = new web3.eth.Contract(MEMBERS["abi"], membersAddress);
let nonCohort = new web3.eth.Contract(NON_COHORT["abi"], nonCohortAddress);

let ipfsBase = 'https://ipfs.io/ipfs/';

let ipfs = ipfsAPI('ipfs.infura.io', 5001, {
    protocol: 'https'
}) // Connect to IPFS




async function uploadReportToIPFS(url) {
    // const data = await axios.get(this.state.rule);
    console.log("[1] Started upload of financial report to IPFS....");
    const reportContent = (await axios.get(url)).data;
    const bufRule = Buffer.from(JSON.stringify(reportContent));
    const reportFile = [
        {
            path: "AuditchainReport.xml",
            content: bufRule
        }];
    const result = await ipfs.files.add(reportFile, { wrapWithDirectory: true });
    const reportIPFSUrl = ipfsBase + result[1].hash + '/' + result[0].path;
    const reportHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(reportContent));

    console.log("[2] Report has been successfully uploaded: " + reportIPFSUrl);
    return [reportIPFSUrl, reportHash];
}

async function verifyPacioli(metadatatUrl) {
    // let reportUrl;
    // //TOD: replace with actual reportUrl 
    // if (config.ExplorerEndpoint === "http://localhost:8181")
    //   reportUrl = "http://xbrlsite.azurewebsites.net/2021/reporting-scheme/proof/reference-implementation/instance.xml"
    // else
    //   reportUrl = this.state.url;
    // this.toggleProgressPopUp("Querying Pacioli....");




    const result = await ipfs.files.cat(metadatatUrl);
    const reportUrl = JSON.parse(result)["reportUrl"];


    const pacioliUrl = "https://pacioli.auditchain.finance/analyseReport_";
    const formatString = "?format=json&apiToken=dummyToken&isLinkbase=false&url=";

    const axiosToCall = pacioliUrl + formatString + reportUrl;
    console.log(axiosToCall);

    const reportContent = (await axios.get(axiosToCall)).data;
    // this.toggleProgressPopUp("Saving Pacioli results to IPFS....");
    console.log("[3] Saving Pacioli Results to IPFS");
    const jsonStringFromObject = JSON.stringify(reportContent);
    const bufRule = Buffer.from(jsonStringFromObject);
    const reportFile = [
        {
            path: "Pacioli.json",
            content: bufRule
        }];
    const resultPacioli = await ipfs.files.add(reportFile, { wrapWithDirectory: true });
    const pacioliIPFS = resultPacioli[1].hash + '/' + resultPacioli[0].path;
    console.log("[4] Pacioli report saved at: " + ipfsBase + pacioliIPFS);
    return pacioliIPFS;
}

async function getReportResult(url) {

    const result = await ipfs.files.cat(url);
    const isValid = JSON.parse(result)["isValid"];

    return isValid;

}


async function saveToIpfs(url) {
    // const reportIPFSUrl = await uploadReportToIPFS(url);
    // console.log("Report uploaded at:", reportIPFSUrl[0]);
    const reportPacioliIPFSUrl = await verifyPacioli(url);
    // this.toggleProgressPopUp("Submitting metadata to IPFS....");
    console.log("[5] Creating metadata file.");
    const isValid = await getReportResult(reportPacioliIPFSUrl);
    let metaDataObject = {
        // reportUrl: reportIPFSUrl[0],
        reportUrl: url,

        // reportHash: reportIPFSUrl[1],
        reportPacioli: reportPacioliIPFSUrl,
        result: isValid
        //   ethAddress: this.props.ethAddress,
    };

    const jsonStringFromObject = JSON.stringify(metaDataObject);
    const buf = Buffer.from(jsonStringFromObject);
    const metadataFile = [
        {
            path: "AuditchainMetadataReport.json",
            content: buf
        }];


    const result = await ipfs.files.add(metadataFile, { wrapWithDirectory: true });

    //    , (err, result) => { // Upload buffer to IPFS         
    //         if (err) {
    //             console.error(err)
    //         }
    const urlMetadata = result[1].hash + '/' + result[0].path;

    console.log("[6] Metadata created: " + ipfsBase + urlMetadata);
    //   this.toggleProgressPopUp("Report successfully submitted.");
    //   this.requestAttestation(url, reportIPFSUrl[1]);
    return isValid;
    // })
}

async function validate(hash, initTime, choice, validator) {


    console.log("[7] Waiting for validation transaction to complete... ");


    // let BN = web3.utils.BN;





    const owner = providerForUpdate.addresses[validator];
    console.log(owner);

   

    nonCohortValidate.methods
        .validate(hash, initTime, choice)
        .send({ from: owner, gas: 500000 })
        .on("receipt", function (receipt) {
            const event = receipt.events.ValidatorValidated.returnValues;
            let msg;
            if (choice == 1)
                console.log("[8] Request has been validated as acceptable.")
            else
                console.log("[8] Request has been validated as adverse")

            // timeMachine.advanceTimeAndBlock(100);


        })
        .on("error", function (error) {
            console.log("An error occured:", error)
        });
}



async function startProcess() {

    console.log("Process started.");

    let myArgs = process.argv.slice(2);
    console.log('myArgs Executed: ', myArgs);

    const owner = providerForUpdate.addresses[Number(myArgs[0])];

    depositAmountBefore = await memberHelpers.methods.deposits(owner).call();
    console.log("balance before:", depositAmountBefore);




    nonCohort.events.ValidationInitialized({})
        .on('data', async function (event) {
            console.log(event.returnValues.url);
            let myArgs = process.argv.slice(2);
            console.log('myArgs: ', myArgs);
            const isValid = await saveToIpfs(event.returnValues.url);
            await validate(event.returnValues.documentHash, event.returnValues.initTime, isValid ? 1 : 2, Number(myArgs[0]))
            // await validate(event.returnValues.documentHash, event.returnValues.initTime, 1, Number(myArgs[0]))


            // Do something here
        })
        .on('error', console.error);


    nonCohort.events.RequestExecuted({})
        .on('data', async function (event) {
            console.log("time executed:" + event.returnValues.timeExecuted);

           
            const owner = providerForUpdate.addresses[Number(myArgs[0])];
            console.log("owner Executed:", owner);
            const balanceAfter = await memberHelpers.methods.deposits(owner).call()
            // .then(function (depositAmountAfter) {

            console.log("balanceAfter:", balanceAfter);

            let earned = BN(balanceAfter.toString()).minus(BN(depositAmountBefore.toString()));
            console.log("You have earned: " + earned / Math.pow(10, 18) + " AUDT.");
            // });
        })
        .on('error', console.error);

}

startProcess();


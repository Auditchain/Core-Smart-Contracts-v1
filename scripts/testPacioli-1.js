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


const projectId = '1z8qlzYj2AXroPUyrvd4UD70Rd1'
const projectSecret = '33a8822b1df29fdc33d0930aab075a7b'
const auth = 'Basic ' + Buffer.from(projectId + ':' + projectSecret).toString('base64');

const ipfs = ipfsAPI({
    host: 'ipfs.infura.io',
    port: 5001,
    protocol: 'https',
    headers: {
        authorization: auth
    }
})

const ipfsBase = 'https://ipfs.infura.io/ipfs/';


// import ethereum connection strings. 
const ropsten_infura_server = process.env.ROPSTEN_INFURA_SERVER;
const rinkeby_infura_server = process.env.RINKEBY_INFURA_SERVER;
const main_infura_server = process.env.MAINNET_INFURA_SERVER;
const goerli_infura_server = process.env.GOERLI_INFURA_SERVER
const local_host = process.env.LOCAL;
const mnemonic = process.env.MNEMONIC;


// Address for smart contracts
const memberAddress = process.env.MEMBER_ADDRESS;
const tokenAddress = process.env.AUDT_TOKEN_ADDRESS;
const validationAddress = process.env.VALIDATIONS_NO_COHORT_ADDRESS;
let providerForUpdate;

const Members = require('../build/contracts/Members.json');
const Token = require('../build/contracts/AuditToken.json');
const Validation = require('../build/contracts/ValidationsNoCohort.json');
const { start } = require('pm2');

let members, token, web3, validation, owner;
let run = 0;


async function uploadReportToIPFS(url) {

    try {
        console.log("Uploading report to IPFS...", url);
        const reportContent = (await axios.get(url)).data;
       
        const bufRule = Buffer.from(reportContent); // to simulate different submissions
        const reportFile = [
            {
                path: "AuditchainReport.xml",
                content: bufRule
            }];
        const result = await ipfs.files.add(reportFile, { wrapWithDirectory: true });
        const reportIPFSUrl = ipfsBase + result[1].hash + '/' + result[0].path;
        const reportHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(reportContent));
        return [reportIPFSUrl, reportHash];   // this is the correct call, but used line below because the same report is submitted multiple times
    } catch (e) {
        console.log(e);
    }
}


async function saveToIpfs(url) {

    try {
        console.log("Report Submitted:", url)
        const reportIPFSUrl = await uploadReportToIPFS(url);

        let randomNum = Math.floor(Math.random() * 1000000);


        let metaDataObject = {
            reportUrl: url,
            ethAddress: providerForUpdate.addresses[0],
            run: run,
            randomNum: randomNum
        };

        const jsonStringFromObject = JSON.stringify(metaDataObject);
        const buf = Buffer.from(jsonStringFromObject);
        const metadataFile = [
            {
                path: "AuditchaiReport.json",
                content: buf
            }];


        const result = await ipfs.add(metadataFile, { wrapWithDirectory: true });
        const urlMetaData = result[1].hash + '/' + result[0].path;
        console.log("Metadata successfully saved.")

        return [reportIPFSUrl[1], urlMetaData];
    } catch (e) {
        console.log(e);
    }
}

async function setUpContracts(account) {

    try {

        providerForUpdate = new HDWalletProvider(account, process.env.WEBSOCKET_PROVIDER); // change to main_infura_server or another testnet. 
        web3 = new Web3(providerForUpdate);
        members = new web3.eth.Contract(Members["abi"], memberAddress);
        token = new web3.eth.Contract(Token["abi"], tokenAddress);
        validation = new web3.eth.Contract(Validation["abi"], validationAddress);

        owner = providerForUpdate.addresses[0];
    } catch (e) {
        console.log(e);
    }
}

let dataSubscriber1 = "0xd431134b507d3B6F2742687e14cD9CbA5b6BE0F4"; // 2

async function deploy() {

    try {

        let randomNum = Math.floor(Math.random() * 1000000);

        let reportURL = "https://xbrlsite.azurewebsites.net/2021/reporting-scheme/proof/reference-implementation/instance.xml";
        let result

        await setUpContracts("0x9ca184fa913e7ca5f49b0c89a2665beac582c12cce4308473ef65f4166d58dfa");
        const dataSubscriber1 = providerForUpdate.addresses[0];
        result = await saveToIpfs(reportURL);

        
        let testHash = web3.utils.keccak256(randomNum.toString());
        console.log("random num:", randomNum);
        console.log("Hash from deploy:", testHash);
        await validation.methods.initializeValidationNoCohort(testHash, result[1], 1, "1000000000000000000").send({ from: dataSubscriber1, gas: 800000 });
        run++;
        console.log("[" + run + "] Run completed");

    } catch (e) {
        console.log(e);
    }
}


setInterval(deploy, 4000);
deploy();
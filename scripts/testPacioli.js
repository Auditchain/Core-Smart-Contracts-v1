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


const projectId = process.env.IPFS_USER;
const projectSecret = process.env.IPFS_PASSWORD;
const auth = 'Basic ' + Buffer.from(projectId + ':' + projectSecret).toString('base64');

const ipfs = ipfsAPI({
    host: 'ipfs.infura.io',
    port: 5001,
    protocol: 'https',
    headers: {
        authorization: auth
    }
})



// const ipfsClient = require("ipfs-http-client");
const { create } = require("ipfs-http-client");



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


async function uploadReportToIPFS(url) {
    console.log("Uploading report to IPFS...", url);
    const reportContent = (await axios.get(url)).data;
    const bufRule = Buffer.from(reportContent);
    const reportFile = [
        {
            path: "AuditchainReport.xml",
            content: bufRule
        }];
    const result = await ipfs.files.add(reportFile, { wrapWithDirectory: true });

    // const reportIPFSUrl = result.cid.string + '/' + "AuditchainReport.json";

    const reportIPFSUrl = ipfsBase + result[1].hash + '/' + result[0].path;
    const reportHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(reportContent));

    // console.log("report url:", reportIPFSUrl);
    // console.log("report hash:", reportHash);

    return [reportIPFSUrl, reportHash];
}



async function saveToIpfs(url) {
    console.log("Report Submitted:", url)
    const reportIPFSUrl = await uploadReportToIPFS(url);


    let metaDataObject = {
        reportUrl: url,
        ethAddress: providerForUpdate.addresses[0],
    };

    const jsonStringFromObject = JSON.stringify(metaDataObject);
    const buf = Buffer.from(jsonStringFromObject);
    const metadataFile = [
        {
            path: "AuditchainMetadataReport.json",
            content: buf
        }];


    const result = await ipfs.add(metadataFile, { wrapWithDirectory: true });
    const urlMetaData = result[1].hash + '/' + result[0].path;
    // const urlMetaData = result.cid.string + '/' + "AuditchainMetadataReport.json";

    console.log("Metadata successfully saved.")

    return [reportIPFSUrl[1], urlMetaData];
}


let user1, user2;




async function setUpContracts(account) {

    providerForUpdate = new HDWalletProvider(account, process.env.WEBSOCKET_PROVIDER); // change to main_infura_server or another testnet. 
    web3 = new Web3(providerForUpdate);
    members = new web3.eth.Contract(Members["abi"], memberAddress);
    token = new web3.eth.Contract(Token["abi"], tokenAddress);
    validation = new web3.eth.Contract(Validation["abi"], validationAddress);

    owner = providerForUpdate.addresses[0];
    console.log("address", owner);


}


// const provider = new Web3.providers.WebsocketProvider(process.env.WEBSOCKET_PROVIDER); // e.g. 'ws://localhost:8545'
// const web3 = new Web3(provider);

// let admin = accounts[0];   // 0


let platformAddress = "0x4311eD2826C3D4E7c82149fAAEe9FB7f40e05568"; // 1

let dataSubscriber1 = "0xd431134b507d3B6F2742687e14cD9CbA5b6BE0F4"; // 2

let dataSubscriber2 = "0x9A1A226Be56E93Ec089b3F35500B9192e1B8F859"; // 11
let dataSubscriber3 = "0xf7Aba62b254d1acCdAA746Af47F92cb9F45D8713"; // 12
let dataSubscriber4 = "0x4afd87F1f8141D7D35C8c4d04695cf5A5eC62A56"; // 13
let dataSubscriber5 = "0xd9689B5f12E166330caff10caD68C9CA1bE9F0c0"; // 14
let dataSubscriber6 = "0x6789544650c40bcC5CDec94f5eccF2BB4567d698"; // 15
let dataSubscriber7 = "0x52726022ce203E7F5e27A3Bed656198701395249"; // 16
let dataSubscriber8 = "0x9B312dD101aB2F3A34fBbb68fFee00000a6ac7dc"; // 17
let dataSubscriber9 = "0x8a08055CB518C8269cE33DDCb397Db2D8FAB7B6E"; // 18
let dataSubscriber10 = "0xf62Fe4550241B9eEf98DC4249a68269130eAb1b4"; // 19
let dataSubscriber11 = "0xd0EA6F791aC7a0bbfeE01Dd047b0dB656722e5cb"; //20



const validatorTokenAmount = "25000000000000000000000"




async function deploy() {

    // let myArgs = process.argv.slice(2);

    let reportURL = "https://xbrlsite.azurewebsites.net/2021/reporting-scheme/proof/reference-implementation/instance.xml";
    let result

    await setUpContracts("0x9ca184fa913e7ca5f49b0c89a2665beac582c12cce4308473ef65f4166d58dfa");
    const dataSubscriber1 = providerForUpdate.addresses[0];
    result = await saveToIpfs(reportURL);
    await validation.methods.initializeValidationNoCohort(result[0], result[1], 1).send({ from: dataSubscriber1, gas: 800000 });
    console.log("Submission for dataSubscriber1");

    reportURL = "http://accounting.auditchain.finance/reporting-scheme/proof/reference-implementation/instance_f.xml";


    await setUpContracts("0x254198af956f996631d6231743b8578f07c9745330081e28af0e29642e896786");
    const dataSubscriber2 = providerForUpdate.addresses[0];
    result = await saveToIpfs(reportURL);
    await validation.methods.initializeValidationNoCohort(result[0], result[1], 1).send({ from: dataSubscriber2, gas: 800000 });
    console.log("Submission for dataSubscriber2");

    reportURL = "http://accounting.auditchain.finance/reporting-scheme/proof/reference-implementation/instance_mf.xml";


    await setUpContracts("0x75e947d1c03407dc87331769842f0c89c915e8a93b480ec055dcafeeca99cac5");
    const dataSubscriber3 = providerForUpdate.addresses[0];
    await saveToIpfs(reportURL);
    await validation.methods.initializeValidationNoCohort(result[0], result[1], 1).send({ from: dataSubscriber3, gas: 800000 });
    console.log("Submission for dataSubscriber3");



    console.log("Run completed");
    // process.exit();
}



setInterval(deploy, 10000)


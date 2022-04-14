"use strict";
// test script based on Bogdan's testPacioli.js. 
// BEWARE, this file contains credentials and private keys!
let Web3 = require('web3');
let ethers = require('ethers');
let axios = require("axios");
let ipfsAPI = require("ipfs-api");
let BN = require("big-number");

let HDWalletProvider = require('@truffle/hdwallet-provider');
require('dotenv').config({ path: './.env' }); // update process.env

const web3_reader = new Web3(new Web3.providers.WebsocketProvider(process.env.WEBSOCKET_PROVIDER));

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

const ipfsBase = 'https://ipfs.infura.io/ipfs/';


// Address for smart contracts
const validationAddress = process.env.VALIDATIONS_NO_COHORT_ADDRESS;

const Validation = require('../build/contracts/ValidationsNoCohort.json')


async function uploadReportToIPFS(url) {
    // startProgressMessage("Uploading report to IPFS...");
    console.log("Uploading report to IPFS...");
    // const data = await axios.get(rule);
    const reportContent = (await axios.get(url)).data;
    const bufRule = Buffer.from(reportContent);
    const reportFile = [
        {
            path: "AuditchainReport.xml",
            content: bufRule
        }];
    const result = await ipfs.files.add(reportFile, { wrapWithDirectory: true });
    const reportIPFSUrl = ipfsBase + result[1].hash + '/' + result[0].path;
    const reportHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(reportContent));

    // console.log("report url:", reportIPFSUrl);
    // console.log("report hash:", reportHash);

    return [reportIPFSUrl, reportHash];
}


async function saveToIpfs(url,address) {
    const  reportIPFSUrl = await uploadReportToIPFS(url);

    let metaDataObject = {
        reportUrl: url,
        ethAddress: address,
    };

    const jsonStringFromObject = JSON.stringify(metaDataObject);
    const buf = Buffer.from(jsonStringFromObject);
    const metadataFile = [
        {
            path: "AuditchainMetadataReport.json",
            content: buf
        }];

    const result = await ipfs.files.add(metadataFile, { wrapWithDirectory: true });
    const urlMetaData = result[1].hash + '/' + result[0].path;
    console.log("Metadata successfully saved.")

    return [reportIPFSUrl[1], urlMetaData];
}

/**
 * 
 * @param {String} account private key
 * @returns {owner:<public address of account>, validator: ValidationContract}
 */
async function setUpContracts(account) {
    let providerForUpdate = new HDWalletProvider(account, process.env.WEBSOCKET_PROVIDER); // environment determines testnet or mainnet
    let web3 = new Web3(providerForUpdate);
    let validator = new web3.eth.Contract(Validation["abi"], validationAddress);
    let owner = providerForUpdate.addresses[0];
    console.log("setUp for address ", owner);
    return {owner: owner, validator:validator};
}

var activeSubmissions = 0;
var submissionErrors = 0;
var submissionCounter = 0;
var firstBlock = 0;
/**
 * 
 * @param {Object} myContractObject 
 * @param {String} reportURL 
 * @returns transactionHash
 */
async function submitReport(myContractObject,reportURL){
    activeSubmissions++; submissionCounter++;
    var result, outcome;
    try {
        result = await saveToIpfs(reportURL,myContractObject.owner);
        outcome = await myContractObject.validator.methods.initializeValidationNoCohort(result[0], result[1], 1).send({ from: myContractObject.owner, gas:800000 });
        console.log(`Submission ${submissionCounter} for ${myContractObject.owner} FINISHED`);
    } catch(e){
        console.log("Error: "+e);
        outcome = null;
    }
    if (outcome) {
        console.log(`${myContractObject.owner} submitted ${reportURL} with ${outcome.transactionHash}`);
        return outcome.transactionHash;
    } else {
        console.log(`${myContractObject.owner} submission of ${reportURL} has FAILED :-(`);
        submissionErrors++;
        return null;
    }
}

// Exits the system if no more submissions left
function finishedReport(){
    activeSubmissions --;
    if (activeSubmissions==0) {
        console.log(`Finished processing ${submissionCounter} submissions`);
        console.log(`  ${submissionErrors} errors`);
        process.exit( !(submissionErrors==0) );
    }
    else console.log(`${activeSubmissions} submissions pending`);
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

async function run() {
    console.log("Setting up accounts...");
    // Setup our report submitters, each with a different account/private key
    const dataSubscriber1 = await setUpContracts("0x9ca184fa913e7ca5f49b0c89a2665beac582c12cce4308473ef65f4166d58dfa");
    const dataSubscriber2 = await setUpContracts("0x254198af956f996631d6231743b8578f07c9745330081e28af0e29642e896786");
    const dataSubscriber3 = await setUpContracts("0x75e947d1c03407dc87331769842f0c89c915e8a93b480ec055dcafeeca99cac5");

    firstBlock = await web3_reader.eth.getBlockNumber();

    const dataSubscribers = [dataSubscriber1,dataSubscriber2,dataSubscriber3];

    const reports = [
        "https://xbrlsite.azurewebsites.net/2021/reporting-scheme/proof/reference-implementation/instance.xml",
        "http://accounting.auditchain.finance/reporting-scheme/proof/reference-implementation/instance_m.xml",
        "http://accounting.auditchain.finance/reporting-scheme/proof/reference-implementation/instance_f.xml",
        "http://accounting.auditchain.finance/reporting-scheme/proof/reference-implementation/instance_mf.xml",
        "http://accounting.auditchain.finance/reporting-scheme/proof/reference-implementation/instance_mft.xml",
        "http://accounting.auditchain.finance/reporting-scheme/proof/reference-implementation/instance_t.xml",
        "http://accounting.auditchain.finance/reporting-scheme/proof/reference-implementation/instance_mftdr.xml",
        "https://www.sec.gov/Archives/edgar/data/1318605/000095017021000046/tsla-20210331.htm",
        "https://www.sec.gov/Archives/edgar/data/1108524/000110852417000040/crm-20171031.xml",
        "https://www.sec.gov/Archives/edgar/data/789019/000156459017000654/msft-20161231.xml",
        "https://www.sec.gov/Archives/edgar/data/1018724/000101872418000005/amzn-20171231.xml",
        "http://www.sec.gov/Archives/edgar/data/1600620/000162828018003228/auph-20171231.xml",
        "http://www.sec.gov/Archives/edgar/data/1651625/000095010318003508/aciu-20171231.xml"
    ];

    console.log("Performing submissions...");
    // A minimal test:
    // if (await submitReport(dataSubscriber1,"https://xbrlsite.azurewebsites.net/2021/reporting-scheme/proof/reference-implementation/instance.xml"))
    //     process.exit(0);
    // else process.exit(1);

    // frantic data subscribers:
    console.log("First lot:")
    for (const DS of dataSubscribers)
        for (const report of reports)
            submitReport(DS,report).then(()=> finishedReport());
    
    while( await web3_reader.eth.getBlockNumber()<firstBlock+2 ){
        console.log("waiting.....");
        sleep(200);
    }

    console.log("Second lot:")
    // Again, with warmed caches:
    for (const DS of dataSubscribers)
        for (const report of reports)
            submitReport(DS,report).then(()=> finishedReport());
    
}

run();


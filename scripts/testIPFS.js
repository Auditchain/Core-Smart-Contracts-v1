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

const {create} = require("ipfs-http-client");
// const ipfs = new ipfsClient();
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

let ipfs1 = ipfsAPI('ipfs.infura.io', 5001, {
    protocol: 'https'
}) //


async function test() {

    const metadataUrl = "QmSD15gFLtSFz4aQjKX8e8KjeKZpLPcXTHrQJjpM8iEffr/AuditchainMetadataReport.json";

    // const content = ipfsClient.Buffer.from('{message: "Oh hai"}')
    // const addResult = await ipfs.add(content)
    // const hash = addResult[0].hash
    // console.log(hash) // QmYcPuH2VagzA9qk3HctaTfQSvX59JNNwvCUCrj35ZB5s5

    const result =  ipfs.cat(metadataUrl);

    
    // for await (const item of result) {
    //     console.log('item', item + "");
    // }

    // console.log(result.item.string);
    // const reportUrl = JSON.parse(result)["reportUrl"];

    // console.log(result);
    // console.log(reportUrl);

    const resultPacioli = await ipfs.add("test", { wrapWithDirectory: true });

    //  for await (const item of resultPacioli) {
    //     console.log('item', item + "");
    // }


    console.log("write", resultPacioli.cid );

}

test();

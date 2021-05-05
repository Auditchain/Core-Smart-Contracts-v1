"use strict";
var express = require('express');
var bodyParser = require('body-parser');
var app = express();
let contract = require('truffle-contract');
let Web3 = require('web3');
let HDWalletProvider = require('@truffle/hdwallet-provider');
// let dotenv = require('dotenv');
// dotenv.config();
let dotenv  = require('dotenv').config({path:'./.env'})

const AUDITTOKEN = require('../build/contracts/AuditToken.json');
const MEMBERS = require('../build/contracts/Members.json');

// import ethereum connection strings. 
const ropsten_infura_server = process.env.ROPSTEN_INFURA_SERVER;
const rinkeby_infura_server = process.env.RINKEBY_INFURA_SERVER;
const main_infura_server = process.env.MAINNET_INFURA_SERVER;
const local_host = process.env.LOCAL;
const mnemonic = process.env.MNEMONIC;

// Address for smart contracts
const auditTokenAddress = process.env.AUDT_TOKEN_ADDRESS;
const membersAddress = process.env.MEMBER_ADDRESS;

const provider = new HDWalletProvider(mnemonic, local_host); // change to main_infura_server or another testnet. 
const web3 = new Web3(provider);
const owner = provider.addresses[0];

let token = new web3.eth.Contract(AUDITTOKEN["abi"], auditTokenAddress);
let members = new web3.eth.Contract(MEMBERS["abi"], membersAddress);





function convertTimestamp(timestamp, onlyDate) {
    var d = new Date(timestamp * 1000), // Convert the passed timestamp to milliseconds
        yyyy = d.getFullYear(),
        mm = ('0' + (d.getMonth() + 1)).slice(-2), // Months are zero based. Add leading 0.
        dd = ('0' + d.getDate()).slice(-2), // Add leading 0.
        hh = d.getHours(),
        h = hh,
        min = ('0' + d.getMinutes()).slice(-2), // Add leading 0.
        sec = d.getSeconds(),
        ampm = 'AM',
        time;


    yyyy = ('' + yyyy).slice(-2);

    if (hh > 12) {
        h = hh - 12;
        ampm = 'PM';
    } else if (hh === 12) {
        h = 12;
        ampm = 'PM';
    } else if (hh == 0) {
        h = 12;
    }

    if (onlyDate) {
        time = mm + '/' + dd + '/' + yyyy;

    } else {
        // ie: 2013-02-18, 8:35 AM	
        time = yyyy + '-' + mm + '-' + dd + ', ' + h + ':' + min + ' ' + ampm;
        time = mm + '/' + dd + '/' + yyyy + '  ' + h + ':' + min + ':' + sec + ' ' + ampm;
    }

    return time;
}


async function getEnterprises() {

    const enterprises = await members.getPastEvents('UserAdded', {
        fromBlock: 0,
        toBlock: 'latest'
    });

    const enterpriseList= [];

    for (let i=0; i< enterprises.length; i++){
        if (enterprises[i].returnValues.userType == 0)
        enterpriseList.push({address: enterprises[i].returnValues.user, name: enterprises[i].returnValues.name });
    }
    return enterpriseList;
}




app.use(express.static('public'));

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());

// Add headers

app.use(function (req, res, next) {

    // Website you wish to allow to connect

    var allowedOrigins = ['http://localhost:8181', 'http://localhost:8000', 'http://localhost:3000'];
    var origin = req.headers.origin;
    if (allowedOrigins.indexOf(origin) > -1) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});

app.get('/index.htm', function (req, res) {
    res.sendFile(__dirname + "/" + "index.htm");
})

app.get('/get_enterprises', function(req,res){

    getEnterprises().then(async function (returnedData) {
        res.end(JSON.stringify(returnedData));
    }).catch(function (err) {
        console.log(err);
    })

})


var server = app.listen(8181, function () {
    var host = server.address().address
    var port = server.address().port
    console.log("Example app listening at http://%s:%s", host, port)

})

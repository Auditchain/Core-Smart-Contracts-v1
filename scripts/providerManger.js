"use strict";
let express = require('express');
let bodyParser = require('body-parser');
let Web3 = require('web3');
const mumbai_server = "https://polygon-mumbai.infura.io/v3/5250187d69d747f392fcf1d32bbbc64a";
let HDWalletProvider = require('@truffle/hdwallet-provider');
require('dotenv').config({ path: '.env' }); // update process.env.

const fs = require('fs');



let app = express();
let privateKey;
let pass;

app.use(express.static('private'));

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());

// Add headers

app.use(function (req, res, next) {

    // Website you wish to allow to connect

    let allowedOrigins = ['http://localhost:8181'];
    let origin = req.headers.origin;
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



app.get('/storePrivateKey', function (req, res) {

    let user = req.query.user;
    privateKey = req.query.privateKey
    pass = req.query.pass;
    console.log("Key created from:", req.ip, new Date() );
    res.end();
});

app.get('/getPrivateKey', function (req, res) {

    let user = req.query.user;
    let passSent = req.query.pass;

    if (user == 'admin' && passSent == pass){
        console.log("Key accessed from:", req.ip , new Date() );
        res.end(privateKey);
    }
    else
        res.end("not authorized");
})


let server = app.listen(3333, function () {
    let host = server.address().address
    let port = server.address().port
    console.log("Example app listening at http://%s:%s", host, port)

})
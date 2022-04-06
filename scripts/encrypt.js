"use strict";
let Web3 = require('web3');
const fs = require('fs')


var web3 = new Web3('http://localhost:8545');

let myArgs = process.argv.slice(2);


let keyStore = web3.eth.accounts.encrypt(myArgs[0], myArgs[1]);

// let data = "Learning how to write in a file."

// let buffedKeyStore = Buffer.from(keyStore);
let res = JSON.stringify(keyStore);
const {address} = JSON.parse(res);

console.log(address);

fs.writeFile('keyStore-' + address ,res , (err) => {
      
    // In case of a error throw err.
    if (err) throw err;
})



"use strict";
let express = require('express');
let bodyParser = require('body-parser');
let app = express();
let contract = require('truffle-contract');
let Web3 = require('web3');
let HDWalletProvider = require('@truffle/hdwallet-provider');
let BN = require("big-number");
let nodemailer = require("nodemailer");



// Add headers

app.use(function (req, res, next) {

    // Website you wish to allow to connect

    var allowedOrigins = ['http://localhost:8181', 'http://localhost:8080', 'https://auditchain.finance'];

    console.log(allowedOrigins);
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

app.use(express.static('public'));

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());



// let dotenv = require('dotenv');
// dotenv.config();
let dotenv = require('dotenv').config({ path: './.env' })

const AUDITTOKEN = require('../build/contracts/AuditToken.json');
const SALE = require('../build/contracts/Sale.json');
const VESTING = require('../build/contracts/Vesting.json')

// import ethereum connection strings. 
const ropsten_infura_server = process.env.ROPSTEN_INFURA_SERVER;
const rinkeby_infura_server = process.env.RINKEBY_INFURA_SERVER;
const main_infura_server = process.env.MAINNET_INFURA_SERVER;
const goerli_infura_server = process.env.GOERLI_INFURA_SERVER;
const polygon_infura_server = process.env.POLYGON_INFURA_SERVER;
const mumbai_infura_server = process.env.MUMBAI_INFURA_SERVER;
const emailUser = process.env.EMAILADDRESS;
const emailPass = process.env.PASSWORD;


const local_host = process.env.LOCAL;
const mnemonic = process.env.MNEMONIC;
const private_key = process.env.PRIVATE_KEY;

// Address for smart contracts
const auditTokenAddress = process.env.AUDT_TOKEN_ADDRESS;
const saleAddress = process.env.SALE_ADDRESS;
const vestingAddress = process.env.VESTING_ADDRESS
const vestingAddressOnePolygon = process.env.VESTING_ADDRESS_ONE_POLYGON;
const vestingAddressTwoPolygon = process.env.VESTING_ADDRESS_TWO_POLYGON;



const provider = new HDWalletProvider(private_key, goerli_infura_server); // change to main_infura_server or another testnet. 
const web3 = new Web3(provider);
const owner = provider.addresses[0];

let token = new web3.eth.Contract(AUDITTOKEN["abi"], auditTokenAddress);
let sale = new web3.eth.Contract(SALE["abi"], saleAddress);
let vesting = new web3.eth.Contract(VESTING["abi"], vestingAddress);


const providerPolygon = new HDWalletProvider(private_key, mumbai_infura_server);
const web3Polygon = new Web3(providerPolygon);

const vestingOne = new web3Polygon.eth.Contract(VESTING["abi"], vestingAddressOnePolygon);
const vestingTwo = new web3Polygon.eth.Contract(VESTING["abi"], vestingAddressTwoPolygon);
let readTxCount = 0;


async function sleep(delayTime) {
    return new Promise(resolve => setTimeout(resolve, delayTime));
}


async function getBurnInfo(transactionHash) {

    try {

        await sleep(70000);
        console.log("hash from getBurnInfo:", transactionHash);
        const result = await web3.eth.getTransactionReceipt(transactionHash);
        console.log("from", result.from);
        console.log("data", result.logs[0].data);
        return [Number(result.logs[0].data), result.from];
        // return ["3500999990000000000000", "0xce943b6765318d32cfcc461a0c9c79c35de5b636"];
    }
    catch (err) {
        console.log(err);
        readTxCount++;
        if (readTxCount < 6) {
            getBurnInfo(transactionHash)
        } else {
            readTxCount = 0;
            console.log("Reached 6 attempts. Giving up");
        }
    }
}


async function hanbdleRegularPurchasers(burnedTokenInfo) {

    try {
        const vestInfo = await sale.methods.tokenHolders(burnedTokenInfo[1]).call();

        if (vestInfo.tokensToSend > 0) {

            //check if user has already migrated
            const vestInfoPolygon = await vestingOne.methods.tokenHolders(burnedTokenInfo[1]).call();
            if (vestInfoPolygon.tokensToSend > 0)
                return "Multiple calls attempted"

            const hundredPercent = (Number(vestInfo.tokensToSend) * 100 / 75) / Math.pow(10, 18);
            const actual = (Number(vestInfo.tokensToSend) + Number(burnedTokenInfo[0]) - Number(vestInfo.releasedAmount)) / Math.pow(10, 18);
            console.log(vestInfo);
            console.log("actual:", actual);
            console.log("100%:", hundredPercent)

            if (Math.round(actual) == Math.round(hundredPercent)) {
                console.log("ok")
                let amountToTransfer = BN(vestInfo.tokensToSend).multiply(110).div(75);
                const nonce = await web3Polygon.eth.getTransactionCount(owner);


                await vestingOne.methods.allocateUserVerify(burnedTokenInfo[1], amountToTransfer, vestInfo.notStaked).send({ from: owner, gas: 300000, nonce: nonce });
                return "OK"
            } else
                return "NOT OK Regular"
        } else
            return "EMPTY"
    }
    catch (err) {
        console.log(err);
        return JSON.stringify(err);
    }


}

async function handleEarlyInvestors(burnedTokenInfo) {


    try {



        const vestInfo = await vesting.methods.tokenHolders(burnedTokenInfo[1]).call();
        console.log("vesting 50%", vestInfo.tokensToSend);

        if (vestInfo.tokensToSend > 0) {
            // check on Polygon if user has already migrageted
            const vestInfoPolygon = await vestingTwo.methods.tokenHolders(burnedTokenInfo[1]).call();
            if (vestInfoPolygon.tokensToSend > 0)
                return "Multiple calls attempted"


            const hundredPercent = (Number(vestInfo.tokensToSend) * 100 / 50) / Math.pow(10, 18);

            const actual = (Number(vestInfo.tokensToSend) + Number(burnedTokenInfo[0]) - Number(vestInfo.releasedAmount)) / Math.pow(10, 18);
            console.log(vestInfo);
            console.log("actual:", actual);
            console.log("100%:", hundredPercent)

            if (Math.round(actual) == Math.round(hundredPercent)) {
                console.log("ok")
                let amountToTransfer = BN(vestInfo.tokensToSend).multiply(110).div(50);
                const nonce = await web3Polygon.eth.getTransactionCount(owner);
                const result = await vestingTwo.methods.allocateUserVerify(burnedTokenInfo[1], amountToTransfer, 0).send({ from: owner, gas: 300000, nonce: nonce });
                return "OK EARLY"
            } else
                return "NOT OK EARLY"
        } else
            return "EMPTY"
    } catch (err) {
        console.log(err);
        return JSON.stringify(err);

    }


}


async function handleCJ(burnedTokenInfo) {


    try {

        // check on Polygon if user has already migrageted
        const vestInfoPolygon = await vestingTwo.methods.tokenHolders(burnedTokenInfo[1]).call();
        if (vestInfoPolygon.tokensToSend > 0)
            return "Multiple calls attempted"

        let amountToTransfer = BN(burnedTokenInfo[0].toString()).multiply(110).div(50);
        const nonce = await web3Polygon.eth.getTransactionCount(owner);
        const result = await vestingTwo.methods.allocateUserVerify(burnedTokenInfo[1], amountToTransfer, 0).send({ from: owner, gas: 300000, nonce: nonce });
        return "OK CJ"


    } catch (err) {
        console.log(err);
        return JSON.stringify(err);

    }


}

async function sendNotification(txData, status, tx) {

    try {

        let transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: emailUser, // generated ethereal user
                pass: emailPass, // generated ethereal password
            },
        });

        // send mail with defined transport object
        let info = await transporter.sendMail({
            from: '"No Reply" <noreply@auditchain.com>', // sender address
            to: "bogdanfiedur@gmail.com, support@auditchain.com", // list of receivers
            // to: "bogdanfiedur@gmail.com", // list of receivers
            subject: "migration invoked for " + tx, // Subject line
            text: "Transaction:" + tx + "\n" + status + "\n Amount:" + txData[0] / Math.pow(10, 18) + " AUDT\n Account:" + txData[1], // plain text body
            // html: status, // html body
        });

        console.log("Message sent: %s", info.messageId);
    }
    catch (err) {
        console.log(err);
    }


}



app.get('/index.htm', function (req, res) {
    res.sendFile(__dirname + "/" + "index.htm");
})


app.get('/get_transaction', function (req, res) {

    console.log("tx:", req.query.tx);

    getBurnInfo(req.query.tx).then(async function (burnedTokenInfo) {

        console.log('address:', burnedTokenInfo[1]);
        console.log('amount:', burnedTokenInfo[0]);

        let result = await hanbdleRegularPurchasers(burnedTokenInfo);

        if (result == "EMPTY")
            result = await handleEarlyInvestors(burnedTokenInfo);

        if (result == "EMPTY")
            result = await handleCJ(burnedTokenInfo);

        await sendNotification(burnedTokenInfo, result, req.query.tx);

        res.end(JSON.stringify(result));

    }).catch(function (err) {
        console.log(err);
    })

})



var server = app.listen(8186, function () {
    var host = server.address().address
    var port = server.address().port
    console.log("Example app listening at http://%s:%s", host, port)

})

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
const memberHelpersAddress = process.env.MEMBER_HELPERS_ADDRESS;
const nodeOperationsAddress = process.env.NODE_OPERATIONS_ADDRESS;
const noCohortAddress = process.env.VALIDATIONS_NO_COHORT_ADDRESS;
const timelockAddress = process.env.TIMELOCK_ADDRESS;
const cohortAddress = process.env.VALIDATIONS_COHORT_ADDRESS;
const depositModifiersAddrss = process.env.DEPOSIT_MODIFIERS_ADDRESS;
const cohortFactoryAddress = process.env.COHORT_FACTORY_ADDRESS;




let providerForUpdate;

const Members = require('../build/contracts/Members.json');
const Token = require('../build/contracts/AuditToken.json');
const MemberHelpers = require('../build/contracts/MemberHelpers.json');
const NodeOperations = require('../build/contracts/NodeOperations.json');
const NoCohort = require('../build/contracts/ValidationsCohort.json');
const TimeLock = require('../build/contracts/Timelock.json');
const Cohort = require('../build/contracts/Validations.json');
const DepositModifiers = require('../build/contracts/DepositModifiers.json');
const CohortFactory = require('../build/contracts/CohortFactory.json');







let members, token, memberHelpers, nodeOperations, noCohort, timelock, cohort, depositModifiers, cohortFactory;

let CONTROLLER_ROLE ;
let MINTER_ROLE ;
let SETTER_ROLE ;


async function setUpContracts(account) {

   console.log("address 1", account);
   console.log("provider", process.env.MUMBAI_SERVER);
    providerForUpdate = new HDWalletProvider(account, process.env.MUMBAI_SERVER); // change to main_infura_server or another testnet. 
    const web3 = new Web3(providerForUpdate);
    members = new web3.eth.Contract(Members["abi"], memberAddress);
    token = new web3.eth.Contract(Token["abi"], tokenAddress);
    memberHelpers = new web3.eth.Contract(MemberHelpers["abi"], memberHelpersAddress);
    nodeOperations = new web3.eth.Contract(NodeOperations["abi"], nodeOperationsAddress);
    noCohort = new web3.eth.Contract(NoCohort["abi"], noCohortAddress);
    timelock = new web3.eth.Contract(TimeLock["abi"], timelockAddress);
    cohort = new web3.eth.Contract(Cohort["abi"], cohortAddress);
    depositModifiers = new web3.eth.Contract(DepositModifiers["abi"], depositModifiersAddrss);
    cohortFactory = new web3.eth.Contract(CohortFactory["abi"], cohortFactoryAddress);


    CONTROLLER_ROLE = web3.utils.keccak256("CONTROLLER_ROLE");
    MINTER_ROLE = web3.utils.keccak256("MINTER_ROLE");
    SETTER_ROLE = web3.utils.keccak256("SETTER_ROLE");


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

let validator1 = "0x5A8bbBdE5bF85Ba241641403001eef87D90087f6"; // 3
let validator2 = "0x162e952B2F0363613F905abC8c93B519e670Fa4f"; // 4
let validator3 = "0x06997173F50DDD017a5f0A87480Ed7220039B46e"; // 5
let validator4 = "0x79b39D5893382ee75e101bFC9c79708ADD480370"; // 6


let validator5 = "0xd3956b952a78C7E6C700883924D52CC776F9E4F2"; // 7
let validator6 = "0x2e5dCB0bdC76d25f8D8349C88e87B44F467171c7"; // 8
let validator7 = "0xc18251F427C6971FE4da9C05EAf56Db78c7aC0a9"; // 21
let validator8 = "0x2f17686D0558733eBba0f6c020bDa44D4229625A"; // 22
let validator9 = "0x327abA0756949C049c0A4dbc490e69142608405D"; // 23
let validator10 = "0xC22ca6121Ad652B1a5F82abAC5491A45ADB25740"; // 24
let validator11 = "0x1A966d59690aB3FC1de4b0bE08242Ff29A6F03Fd"; // 25
let validator12 = "0x6c65db9D7a40b3caeb3AD92AED9c9D89C480D194"; // 26

let validator13 = "0x069dcE9e6C1e34bdd18Aa7A3a13cbE2274b6601F"; // 27
let validator14 = "0x9596a77DA1d79Cde87E1a499188E1dA8e5A4Fc20"; // 28
let validator15 = "0xc439417449a0F05dc45dB2fA8f76571169Fb7E75"; // 29
let validator16 = "0xC56793118415Cf8E900195eFd584A0364e0429b4"; // 30

const validatorTokenAmount = "25000000000000000000000"




async function deploy() {

    let myArgs = process.argv.slice(2);

    setUpContracts(myArgs[0]);

    const admin = providerForUpdate.addresses[0];



    // await memberHelpers.methods.grantRole(CONTROLLER_ROLE, admin).send( { from: admin });
    // console.log("memberHelpers.grantRole(CONTROLLER_ROLE, admin).send( { from: admin })")


    // await memberHelpers.methods.grantRole(CONTROLLER_ROLE, noCohort._address).send( { from: admin });
    // console.log('memberHelpers.methods.grantRole(CONTROLLER_ROLE, noCohort.address, { from: admin })')

    // await memberHelpers.methods.grantRole(CONTROLLER_ROLE, depositModifiers._address).send( { from: admin });
    // console.log('memberHelpers.methods.grantRole(CONTROLLER_ROLE, depositModifiers.address, { from: admin })')


    // await memberHelpers.methods.grantRole(CONTROLLER_ROLE, nodeOperations._address).send( { from: admin });
    // console.log('memberHelpers.methods.grantRole(CONTROLLER_ROLE, nodeOperations.address, { from: admin })');

    // await memberHelpers.methods.grantRole(CONTROLLER_ROLE, cohort._address).send( { from: admin });
    // console.log('memberHelpers.methods.grantRole(CONTROLLER_ROLE, cohort.address, { from: admin })')


    // await nodeOperations.methods.grantRole(CONTROLLER_ROLE, cohort._address).send( { from: admin });
    // console.log('nodeOperations.methods.grantRole(CONTROLLER_ROLE, cohort.address, { from: admin });')

    // await nodeOperations.methods.grantRole(CONTROLLER_ROLE, noCohort._address).send( { from: admin });
    // console.log('nodeOperations.methods.grantRole(CONTROLLER_ROLE, noCohort.address, { from: admin });')

    // await nodeOperations.methods.grantRole(CONTROLLER_ROLE, depositModifiers._address).send( { from: admin });
    // console.log('nodeOperations.methods.grantRole(CONTROLLER_ROLE, depositModifiers.address, { from: admin });')

    // await members.methods.grantRole(CONTROLLER_ROLE, admin).send( { from: admin });
    // console.log('members.methods.grantRole(CONTROLLER_ROLE, admin, { from: admin });');


    // await members.methods.grantRole(SETTER_ROLE, timelock._address).send( { from: admin });
    // console.log('members.methods.grantRole(SETTER_ROLE, timelock.address, { from: admin });');

    // await cohortFactory.methods.grantRole(SETTER_ROLE, timelock._address).send( { from: admin });
    // console.log('cohortFactory.methods.grantRole(SETTER_ROLE, timelock.address, { from: admin });');

    // await nodeOperations.methods.grantRole(SETTER_ROLE, timelock._address).send( { from: admin });
    // console.log('nodeOperations.methods.grantRole(SETTER_ROLE, timelock.address, { from: admin });');



    // await token.methods.grantRole(CONTROLLER_ROLE, admin).send( { from: admin });
    // console.log('token.methods.grantRole(CONTROLLER_ROLE, admin, { from: admin });')

    // await token.methods.grantRole(CONTROLLER_ROLE, members._address).send( { from: admin });
    // console.log('token.methods.grantRole(CONTROLLER_ROLE, members.address, { from: admin });');

    // await token.methods.grantRole(CONTROLLER_ROLE, memberHelpers._address).send( { from: admin });
    // console.log('token.methods.grantRole(CONTROLLER_ROLE, memberHelpers.address, { from: admin });')


    // await token.methods.grantRole(CONTROLLER_ROLE, nodeOperations._address).send({ from: admin });
    // console.log('token.methods.grantRole(CONTROLLER_ROLE, nodeOperations.address) { from: admin });');

    // await token.methods.grantRole(CONTROLLER_ROLE, depositModifiers._address).send( { from: admin });
    // console.log('token.methods.grantRole(CONTROLLER_ROLE, depositModifiers.address, { from: admin });')


    await depositModifiers.methods.grantRole(CONTROLLER_ROLE, cohort._address).send( { from: admin });
    console.log('depositModifiers.methods.grantRole(CONTROLLER_ROLE, cohort.address, { from: admin });');

    await depositModifiers.methods.grantRole(CONTROLLER_ROLE, noCohort._address).send( { from: admin });
    console.log('epositModifiers.methods.grantRole(CONTROLLER_ROLE, noCohort.address, { from: admin });');

    await depositModifiers.methods.grantRole(MINTER_ROLE, admin).send( { from: admin });
    console.log('epositModifiers.methods.grantRole(MINTER_ROLE, admin, { from: admin });');

    await memberHelpers.methods.setValidation(cohort._address).send( { from: admin });
    console.log('memberHelpers.setValidation(cohort.address, { from: admin });')


    await members.methods.addUser(validator1, "Validator 1", 1).send({from: admin });
    console.log('members.methods.addUser(validator1, "Validator 1", 1).send({from: admin });');

    await await members.methods.addUser(validator2, "Validator 2", 1).send({from: admin });
    console.log('await members.methods.addUser(validator2, "Validator 2", 1).send({from: admin });');

    await members.methods.addUser(validator3, "Validator 3", 1).send({from: admin });
    console.log('await members.methods.addUser(validator3, "Validator 3", 1).send({from: admin });');

    await members.methods.addUser(validator4, "Validator 4", 1).send({from: admin });
    console.log('await members.methods.addUser(validator4, "Validator 4", 1).send({from: admin });');



    await members.methods.addUser(validator5, "Validator 5", 1).send({from: admin });
    console.log('await members.methods.addUser(validator5, "Validator 5", 1).send({from: admin });');

    await members.methods.addUser(validator6, "Validator 6", 1).send({from: admin });
    console.log('await members.methods.addUser(validator6, "Validator 6", 1).send({from: admin });');

    await members.methods.addUser(validator7, "Validator 7", 1).send({from: admin });
    console.log('await members.methods.addUser(validator7, "Validator 7", 1).send({from: admin });');

    await members.methods.addUser(validator8, "Validator 8", 1).send({from: admin });
    console.log('await members.methods.addUser(validator8, "Validator 8", 1).send({from: admin });');




    await members.methods.addUser(validator9, "Validator 9", 1).send({from: admin });
    console.log('await members.methods.addUser(validator9, "Validator 9", 1).send({from: admin });');

    await members.methods.addUser(validator10, "Validator 10", 1).send({from: admin });
    console.log('await members.methods.addUser(validator10, "Validator 10", 1).send({from: admin });');

    await members.methods.addUser(validator11, "Validator 11", 1).send({from: admin });
    console.log('await members.methods.addUser(validator11, "Validator 11", 1).send({from: admin });');

    await members.methods.addUser(validator12, "Validator 12", 1).send({from: admin });
    console.log('await members.methods.addUser(validator12, "Validator 12", 1).send({from: admin });');


    await members.methods.addUser(validator13, "Validator 13", 1).send({from: admin });
    console.log('await members.methods.addUser(validator13, "Validator 13", 1).send({from: admin });');

    await members.methods.addUser(validator14, "Validator 14", 1).send({from: admin });
    console.log('await members.methods.addUser(validator14, "Validator 14", 1).send({from: admin });');

    await members.methods.addUser(validator15, "Validator 15", 1).send({from: admin });
    console.log('await members.methods.addUser(validator15, "Validator 15", 1).send({from: admin });');

    await members.methods.addUser(validator16, "Validator 16", 1).send({from: admin });
    console.log('await members.methods.addUser(validator16, "Validator 16", 1).send({from: admin });');



    await members.methods.addUser(dataSubscriber1, "Datasubscriber 1", 2).send({from: admin });
    console.log('await members.methods.addUser(dataSubscriber1, "Datasubscriber 1", 2).send({from: admin });');

    await members.methods.addUser(dataSubscriber2, "Datasubscriber 2", 2).send({from: admin });
    console.log('await members.methods.addUser(dataSubscriber2, "Datasubscriber 2", 2).send({from: admin });');

    await members.methods.addUser(dataSubscriber3, "Datasubscriber 3", 2).send({from: admin });
    console.log('await members.methods.addUser(dataSubscriber3, "Datasubscriber 3", 2).send({from: admin });');

    await members.methods.addUser(dataSubscriber4, "Datasubscriber 4", 2).send({from: admin });
    console.log('await members.methods.addUser(dataSubscriber4, "Datasubscriber 4", 2).send({from: admin });');


    await members.methods.addUser(dataSubscriber5, "Datasubscriber 5", 2).send({from: admin });
    console.log('await members.methods.addUser(dataSubscriber5, "Datasubscriber 5", 2).send({from: admin });');

    await members.methods.addUser(dataSubscriber6, "Datasubscriber 6", 2).send({from: admin });
    console.log('await members.methods.addUser(dataSubscriber6, "Datasubscriber 6", 2).send({from: admin });');

    await members.methods.addUser(dataSubscriber7, "Datasubscriber 7", 2).send({from: admin });
    console.log('await members.methods.addUser(dataSubscriber7, "Datasubscriber 7", 2).send({from: admin });');

    await members.methods.addUser(dataSubscriber8, "Datasubscriber 8", 2).send({from: admin });
    console.log('await members.methods.addUser(dataSubscriber8, "Datasubscriber 8", 2).send({from: admin });');


    await members.methods.addUser(dataSubscriber9, "Datasubscriber 9", 2).send({from: admin });
    console.log('await members.methods.addUser(dataSubscriber9, "Datasubscriber 9", 2).send({from: admin });');

    await members.methods.addUser(dataSubscriber10, "Datasubscriber 10", 2).send({from: admin });
    console.log('await members.methods.addUser(dataSubscriber10, "Datasubscriber 10", 2).send({from: admin });');

    await members.methods.addUser(dataSubscriber11, "Datasubscriber 11", 2).send({from: admin });
    console.log('await members.methods.addUser(dataSubscriber11, "Datasubscriber 11", 2).send({from: admin });');




    // await token.methods.transfer(dataSubscriber1, validatorTokenAmount).send({from: admin });
    // await token.methods.transfer(dataSubscriber2, validatorTokenAmount).send({from: admin });
    // await token.methods.transfer(dataSubscriber3, validatorTokenAmount).send({from: admin });
    // await token.methods.transfer(dataSubscriber4, validatorTokenAmount).send({from: admin });
    // await token.methods.transfer(dataSubscriber5, validatorTokenAmount).send({from: admin });
    // await token.methods.transfer(dataSubscriber6, validatorTokenAmount).send({from: admin });
    // await token.methods.transfer(dataSubscriber7, validatorTokenAmount).send({from: admin });
    // await token.methods.transfer(dataSubscriber8, validatorTokenAmount).send({from: admin });
    // await token.methods.transfer(dataSubscriber9, validatorTokenAmount).send({from: admin });
    // await token.methods.transfer(dataSubscriber10, validatorTokenAmount).send({from: admin });
    // await token.methods.transfer(dataSubscriber11, validatorTokenAmount).send({from: admin });


    // await token.methods.transfer(validator1, validatorTokenAmount).send({from: admin });
    // await token.methods.transfer(validator2, validatorTokenAmount).send({from: admin });
    // await token.methods.transfer(validator3, validatorTokenAmount).send({from: admin });
    // await token.methods.transfer(validator4, validatorTokenAmount).send({from: admin });
    // await token.methods.transfer(validator5, validatorTokenAmount).send({from: admin });
    // await token.methods.transfer(validator6, validatorTokenAmount).send({from: admin });
    // await token.methods.transfer(validator7, validatorTokenAmount).send({from: admin });
    // await token.methods.transfer(validator8, validatorTokenAmount).send({from: admin });


    // await token.methods.transfer(validator9, validatorTokenAmount).send({from: admin });
    // await token.methods.transfer(validator10, validatorTokenAmount).send({from: admin });
    // await token.methods.transfer(validator11, validatorTokenAmount).send({from: admin });
    // await token.methods.transfer(validator12, validatorTokenAmount).send({from: admin });
    // await token.methods.transfer(validator13, validatorTokenAmount).send({from: admin });
    // await token.methods.transfer(validator14, validatorTokenAmount).send({from: admin });
    // await token.methods.transfer(validator15, validatorTokenAmount).send({from: admin });
    // await token.methods.transfer(validator16, validatorTokenAmount).send({from: admin });


    await token.methods.mint(dataSubscriber1, validatorTokenAmount).send( { from: admin });
    await token.methods.mint(dataSubscriber2, validatorTokenAmount).send( { from: admin });
    await token.methods.mint(dataSubscriber3, validatorTokenAmount).send( { from: admin });
    await token.methods.mint(dataSubscriber4, validatorTokenAmount).send( { from: admin });
    await token.methods.mint(dataSubscriber5, validatorTokenAmount).send( { from: admin });
    await token.methods.mint(dataSubscriber6, validatorTokenAmount).send( { from: admin });
    await token.methods.mint(dataSubscriber7, validatorTokenAmount).send( { from: admin });
    await token.methods.mint(dataSubscriber8, validatorTokenAmount).send( { from: admin });
    await token.methods.mint(dataSubscriber9, validatorTokenAmount).send( { from: admin });
    await token.methods.mint(dataSubscriber10, validatorTokenAmount).send( { from: admin });
    await token.methods.mint(dataSubscriber11, validatorTokenAmount).send( { from: admin });


    await token.methods.mint(validator1, validatorTokenAmount).send( { from: admin });
    await token.methods.mint(validator2, validatorTokenAmount).send( { from: admin });
    await token.methods.mint(validator3, validatorTokenAmount).send( { from: admin });
    await token.methods.mint(validator4, validatorTokenAmount).send( { from: admin });
    await token.methods.mint(validator5, validatorTokenAmount).send( { from: admin });
    await token.methods.mint(validator6, validatorTokenAmount).send( { from: admin });
    await token.methods.mint(validator7, validatorTokenAmount).send( { from: admin });
    await token.methods.mint(validator8, validatorTokenAmount).send( { from: admin });
    await token.methods.mint(validator9, validatorTokenAmount).send( { from: admin });
    await token.methods.mint(validator10, validatorTokenAmount).send( { from: admin });
    await token.methods.mint(validator11, validatorTokenAmount).send( { from: admin });
    await token.methods.mint(validator12, validatorTokenAmount).send( { from: admin });
    await token.methods.mint(validator13, validatorTokenAmount).send( { from: admin });
    await token.methods.mint(validator14, validatorTokenAmount).send( { from: admin });
    await token.methods.mint(validator15, validatorTokenAmount).send( { from: admin });
    await token.methods.mint(validator16, validatorTokenAmount).send( { from: admin });


    console.log("FINISHED");



}

deploy();


"use strict";
let contract = require('truffle-contract');
let Web3 = require('web3');
let HDWalletProvider = require('@truffle/hdwallet-provider');
let dotenv  = require('dotenv').config({ path: require('find-config')('.env') })
// let dotenv  = require('dotenv').config({path:'../.env'})
// let dotenv = require('dotenv');
// dotenv.config();


const COHORT = require('../build/contracts/Cohort.json');
const COHORT_FACTORY = require('../build/contracts/CohortFactory.json');
const AUDIT_TOKEN = require('../build/contracts/AuditToken.json');
const MEMBERS = require('../build/contracts/Members.json');


// import ethereum connection strings. 
const ropsten_infura_server = process.env.ROPSTEN_INFURA_SERVER;
const rinkeby_infura_server = process.env.RINKEBY_INFURA_SERVER;
const main_infura_server = process.env.MAINNET_INFURA_SERVER;
const local_host = process.env.LOCAL;
const mnemonic = process.env.MNEMONIC;
const private_key = process.env.PRIVATE_KEY;
const CONTROLLER_ROLE = process.env.CONTROLLER_ROLE

console.log(private_key);

const gasPrice = process.env.GAS_PRICE;
const gasLimit = process.env.GAS_LIMIT;

// Address of cohortFactory smart contract
const cohortFactoryAddress = process.env.COHORT_FACTORY_ADDRESS;

// Address of token contract
const auditTokenAddress = process.env.AUDT_TOKEN_ADDRESS;

// Address of member contract
const membersAddress = process.env.MEMBER_ADDRESS;
const provider = new HDWalletProvider(mnemonic, local_host); // change to main_infura_server or another testnet. 
const web3 = new Web3(provider);
const owner = provider.addresses[0];
// const owner = "0x67794670742BA1E53FD04d8bA22a9b4487CE65B4";

console.log("owner:", owner);

let auditToken = new web3.eth.Contract(AUDIT_TOKEN["abi"], auditTokenAddress);
let cohortFactory = new web3.eth.Contract(COHORT_FACTORY["abi"], cohortFactoryAddress);
let members = new web3.eth.Contract(MEMBERS["abi"], membersAddress);

// determine consensus for validation
// if there is more "yes" responses than consensus is for approval
// otherwise it is disapproved
// If yes == no, there is lack of consensus (unresolved) 
// returns consensus flag
function determineConsensus(validation) {

    const validatorsValues = validation[2];
    let yes = 0, no = 0;

    for (const key of validatorsValues) {

        if (key == 1)
            yes++;
        else
            no++;
    }

    if (yes > no)
        return 1; // consensus is to approve
    else if (no > yes)
        return 2; // consensus is to disapprove
    else
        return 0; // consensus is tie - should not happen
}



// determine who is eligible for rewards
// validator who is not in consensus will be removed from rewards
// by marking their eligibility to false
function determineRewards(validation, consensus) {

    const validatorsValues = validation[2]; // choice made by validator
    let awards = [];

    for (let i = 0; i < validatorsValues.length; i++) {
        if (validatorsValues[i] == consensus)
            awards[i] = true;       // validator eligible for reward 
        else
            awards[i] = false;      // validator not eligible for reward 
    }
    validation[3] = awards;
    return validation;
}


// calculate total sum of deposits for given validation
// to determine percentage of awards for eligible validators
// those who were in consensus.
// Return sum to the caller
function calculateEligibleDeposits(validation) {

    let sum = 0;
    for (let k = 0; k < validation[0].length; k++) {

        if (validation[3][k]) {
            sum += Number(validation[1][k]);
        }
    }
    return sum;
}

// It will be called to process all validations since last run
// for each cohort in the system. 
async function processDailyTransaction() {

    const cohortCreatedEvent = await cohortFactory.getPastEvents('CohortCreated', {
        fromBlock: 0,
        toBlock: 'latest',
    })

    console.log("cohort:" + cohortCreatedEvent[0].returnValues.cohort);
    for (let i = 0; i < cohortCreatedEvent.length; i++) {
        await processValidations(cohortCreatedEvent[i].returnValues.cohort);
    }
}


// It will process all validations for one cohort since 
// last validation. It can be run multiple times without
// danger of processing already processed validations 
async function processValidations(cohortAddress) {

    // const cohortInstance = await cohort.at(cohortAddress);

    let cohortInstance = new web3.eth.Contract(COHORT["abi"], cohortAddress);


    // get the marker from which to search for new validations
    let recentBlockUpdated = await members.methods.recentBlockUpdated().call();
    // get list of validations which were executed within specified blocks range
    const validationsExecuted = await cohortInstance.getPastEvents('ValidationExecuted', {
        fromBlock: recentBlockUpdated,
        toBlock: 'latest'
    });

    if (validationsExecuted.length == 0) {
        console.log("Cohort at address:" + cohortAddress + " doesn't have any validations to process.");
        return 0;
    }
    // extract validation hash and time executed from 
    // each validation
    const validationHashes = [];
    validationsExecuted.forEach(async (e, index) => {
        const { validationHash, timeExecuted } = e.returnValues;
        validationHashes[index] = validationHash;
    });


    const values = validationHashes.values();
    let index = 0;
    let dayValidations = [];

    // compute values for the entire day
    // - determine consensus
    // - determine who is eligible for rewards (only those who were in consensus)
    // and store it in the dayValidations array
    for (const key of values) {
        const validation = await cohortInstance.methods.collectValidationResults(key).call({ from: owner });
        const consensus = determineConsensus(validation);
        const awardValidation = determineRewards(validation, consensus);

        dayValidations[index] = awardValidation;
        index++;
    }


    let validationShare = [];

    // navigate through all daily validations and find average reward share
    // for each validator during one day.
    // store it in the validationShare array
    for (let i = 0; i < dayValidations.length; i++) {
        // find out total deposit sum for this validation
        const depositsSum = calculateEligibleDeposits(dayValidations[i]);

        for (let j = 0; j < dayValidations[0][0].length; j++) { // all validators in one validation

            const address = dayValidations[i][0][j];
            const stake = dayValidations[i][1][j];
            let validatorShare = 0;
            if (dayValidations[i][3][j])  // validator is in the consensus
                validatorShare = Number(stake) * 100 / depositsSum;

            if (validationShare[address] == undefined)
                validationShare[address] = 0;

            // keep adding all shared values for each validator throughout the day
            validationShare[address] = validationShare[address] + validatorShare;
        }
    }


    let validators = await cohortInstance.methods.returnValidators().call();
    let divider = dayValidations.length;
    let tokens = [];

    // calculate amount of reward tokens for each validator for one day
    let tokensToAwardPerValidation = await members.methods.amountTokensPerValidation().call();
    let platformShare = await cohortInstance.methods.platformShare().call();
    let validatorShare = 100 - Number(platformShare);  // calculate the validator share 
    // actual validator share per validation after applying platform share. 
    let tokensToAwardPerValidationShare = (Number(tokensToAwardPerValidation) * validatorShare) / 100;

    // total amount of tokens for this cohort for this run. 
    let tokensToAwardPerDay = Number(tokensToAwardPerValidationShare) * dayValidations.length;

    // calculate amount of tokens earned for each validator
    for (let i = 0; i < validators.length; i++) {
        tokens[i] = (((validationShare[validators[i]] / divider) * tokensToAwardPerDay) / 100).toString();
    }

    // perform the update
    try {
        let CONTROLLER_ROLE = web3.utils.keccak256("CONTROLLER_ROLE");

        // assign controller roles if needed
        const hasControllerRoleInMembers = await members.methods.hasRole(CONTROLLER_ROLE, owner).call();

        if (!hasControllerRoleInMembers)
            await members.methods.grantRole(CONTROLLER_ROLE, owner).send({ from: owner });

        const hasControllerRoleInToken = await auditToken.methods.hasRole(CONTROLLER_ROLE, membersAddress).call();
        if (!hasControllerRoleInToken)
            await auditToken.methods.grantRole(CONTROLLER_ROLE, membersAddress).send({ from: owner });

        const hasControllerRoleInCohort = await cohortInstance.methods.hasRole(CONTROLLER_ROLE, membersAddress).call();

        if (!hasControllerRoleInCohort)
            await cohortInstance.methods.grantRole(CONTROLLER_ROLE, membersAddress).send({ from: owner });

        let result = await members.methods.updateDailyEarningsTransferFunds(validators, tokens, cohortAddress).send({ from: owner, gas: 2000000 });

        if (result.events.LogRewardsDeposited.returnValues.cohort == cohortInstance._address) {
            console.log("Daily Validation Update successfully executed and tokens transferred for cohort at address: " + cohortAddress);
            console.log(dayValidations.length + " validations have been processed.");
        }

    } catch (e) {
        console.error(e);
        return false;
    }
}

processDailyTransaction().then(async function () {
    process.exit();
}).catch(function (err) {
    console.log(err);
})

// Use the logic below to create new environment each time it runs 
// require('./createEnvironment.js').createEnvironment().then(async function (res) {
//     console.log("Cohort address:", res[0]);
// require('./simulateValidations.js').simulateValidations().then(async function (res) {
//     return processValidations(res[0]);
// }).then(function () {
//     process.exit();
// }).catch(function (err) {
//     console.log(err);
// })

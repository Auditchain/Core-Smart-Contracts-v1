import { assert } from 'chai';
import { en } from 'ethers/wordlists';


const NFT = artifacts.require('./RulesERC721Token.sol');
const MEMBERS = artifacts.require('../Members');
const TOKEN = artifacts.require('../AuditToken');
const COHORTFACTORY = artifacts.require('../CohortFactory');

const Cohort = require('../build/contracts/Cohort.json');
const CREATECOHORT = artifacts.require('../CreateCohort');

var BigNumber = require('big-number');
let SETTER_ROLE = web3.utils.keccak256("SETTER_ROLE");
let CONTROLLER_ROLE = web3.utils.keccak256("CONTROLLER_ROLE");

import {
    ensureException,
    duration
} from './helpers/utils.js';




contract("NFT rules contract", (accounts) => {

    const owner = accounts[0];
    const enterprise1 = accounts[1];
    const validator1 = accounts[2];
    const validator2 = accounts[3];
    const validator3 = accounts[4];
    const validator4 = accounts[5];
    const platformAccount = accounts[6];
    const addressZero = "0x0000000000000000000000000000000000000000"


    let auditTokenMin = "5000000000000000000000";
    let auditTokenLesMin = "1";
    let auditTokenMorMax = "25100000000000000000000";
    let auditTokenMax = "25000000000000000000000";
    let tokenName = "Auditchain Rules";
    let tokenSymbol = "ARN"
    let rules;

    let members;
    let token;
    let cohortFactory;
    let createCohort;
    let cohortAddress;
    let cohortContract;


    beforeEach(async () => {
        rules = await NFT.new(tokenName, tokenSymbol);
        // await rules.grantRole(CONTROLLER_ROLE, owner, { from: owner });

        token = await TOKEN.new(owner);

        members = await MEMBERS.new(token.address, platformAccount);

        createCohort = await CREATECOHORT.new(members.address, token.address)
        cohortFactory = await COHORTFACTORY.new(members.address, createCohort.address);

        // let CONTROLLER_ROLE = web3.utils.keccak256("CONTROLLER_ROLE");
        await members.grantRole(CONTROLLER_ROLE, owner, { from: owner });
        await members.setCohortFactory(cohortFactory.address, { from: owner });
        await createCohort.grantRole(CONTROLLER_ROLE, cohortFactory.address, { from: owner });

        await members.addUser(enterprise1, "Enterprise 1", 0, { from: owner });
        await members.addUser(validator1, "Validators 1", 1, { from: owner });
        await members.addUser(validator2, "Validators 2", 1, { from: owner });
        await members.addUser(validator3, "Validators 3", 1, { from: owner });

        await token.transfer(validator1, auditTokenMin, { from: owner });
        await token.transfer(validator2, auditTokenMin, { from: owner });
        await token.transfer(validator3, auditTokenMin, { from: owner });
        await token.transfer(enterprise1, auditTokenMin, { from: owner });

        await token.approve(members.address, auditTokenMin, { from: validator1 });
        await token.approve(members.address, auditTokenMin, { from: validator2 });
        await token.approve(members.address, auditTokenMin, { from: validator3 });

        await members.stake(auditTokenMin, { from: validator1 });
        await members.stake(auditTokenMin, { from: validator2 });
        await members.stake(auditTokenMin, { from: validator3 });


        await cohortFactory.inviteValidator(validator1, 0, addressZero, { from: enterprise1 });
        await cohortFactory.inviteValidator(validator2, 0, addressZero, { from: enterprise1 });
        await cohortFactory.inviteValidator(validator3, 0, addressZero, { from: enterprise1 });
        await cohortFactory.acceptInvitation(enterprise1, 0, { from: validator1 });
        await cohortFactory.acceptInvitation(enterprise1, 1, { from: validator2 });
        await cohortFactory.acceptInvitation(enterprise1, 2, { from: validator3 });

        let result = await cohortFactory.createCohort(0, { from: enterprise1 });

        assert.lengthOf(result.logs, 2);

        let event = result.logs[1];
        assert.equal(event.event, 'CohortCreated');
        cohortAddress = event.args.cohort;
        cohortContract = new web3.eth.Contract(Cohort["abi"], cohortAddress);

        await cohortContract.methods.grantRole(CONTROLLER_ROLE, owner).send({ from: owner });
        // await token.grantRole(CONTROLLER_ROLE, cohortAddress, { from: owner });
    })


    describe("Constructor", async () => {
        it("Verify constructors", async () => {

            let tokenName = await rules.name();
            console.log("token name:", JSON.stringify(tokenName));
            assert.equal(tokenName.toString(), tokenName);

            let tokenSymbol = await rules.symbol();
            assert.equal(tokenSymbol.toString(), tokenSymbol);

            let totalSupply = await rules.totalSupply();
            assert.equal(totalSupply.toString(), "0");
        });
    });

    describe("mintTo", async () => {

        it('It should fail minting of  1 token to enterprise1 with valid hash id but before validation has been done ', async () => {

            let documentHash = web3.utils.soliditySha3("2+2=4");
            await token.transfer(enterprise1, auditTokenMin, { from: owner });
            await token.approve(members.address, auditTokenMin, { from: enterprise1 });
            await members.stake(auditTokenMin, { from: enterprise1 });
            let result = await cohortContract.methods.initializeValidation(documentHash, "url").send({ from: enterprise1, gas: 200000 });

            let values = result.events.ValidationInitialized.returnValues;
            let validationHash = values.validationHash;

            try {
                result = await rules.mintTo(validationHash, cohortAddress, { from: enterprise1 });
            }
            catch (error) {
                ensureException(error);
            }




        })


        it('It should succeed minting of 1 token to enterprise1 with valid hash id and successful verification ', async () => {

            let documentHash = web3.utils.soliditySha3("2+2=4");
            await token.transfer(enterprise1, auditTokenMin, { from: owner });
            await token.approve(members.address, auditTokenMin, { from: enterprise1 });
            await members.stake(auditTokenMin, { from: enterprise1 });
            let result = await cohortContract.methods.initializeValidation(documentHash, "url").send({ from: enterprise1, gas: 200000 });

            let validationInitTime = result.events.ValidationInitialized.returnValues.initTime;

            await cohortContract.methods.validate(documentHash, validationInitTime, 1).send({ from: validator1, gas: 200000 });
            await cohortContract.methods.validate(documentHash, validationInitTime, 1).send({ from: validator2, gas: 200000 });
            await cohortContract.methods.validate(documentHash, validationInitTime, 1).send({ from: validator3, gas: 200000 });

            let values = result.events.ValidationInitialized.returnValues;
            let validationHash = values.validationHash;
            result = await rules.mintTo(validationHash, cohortAddress, { from: enterprise1 });
            let event = result.logs[1];
            assert.equal(event.event, 'Mint');
            let tokenId = event.args.tokenId;
            let recipient = event.args.recipient;


            assert.strictEqual(tokenId.toString(), "1");
            assert.strictEqual(recipient, enterprise1);


        })


        it('It should fail minting the same token twice for one rule ', async () => {

            let documentHash = web3.utils.soliditySha3("2+2=4");
            await token.transfer(enterprise1, auditTokenMin, { from: owner });
            await token.approve(members.address, auditTokenMin, { from: enterprise1 });
            await members.stake(auditTokenMin, { from: enterprise1 });
            let result = await cohortContract.methods.initializeValidation(documentHash, "url").send({ from: enterprise1, gas: 200000 });

            let validationInitTime = result.events.ValidationInitialized.returnValues.initTime;

            await cohortContract.methods.validate(documentHash, validationInitTime, 1).send({ from: validator1, gas: 200000 });
            await cohortContract.methods.validate(documentHash, validationInitTime, 1).send({ from: validator2, gas: 200000 });
            await cohortContract.methods.validate(documentHash, validationInitTime, 1).send({ from: validator3, gas: 200000 });

            let values = result.events.ValidationInitialized.returnValues;
            let validationHash = values.validationHash;
            result = await rules.mintTo(validationHash, cohortAddress, { from: enterprise1 });

            try {
                result = await rules.mintTo(validationHash, cohortAddress, { from: enterprise1 });
            }
            catch (error) {
                ensureException(error);
            }

        })


        it('It should fail minting of 1 token to enterprise1 with valid hash id but unsuccessful verification ', async () => {

            let documentHash = web3.utils.soliditySha3("2+2=4");
            await token.transfer(enterprise1, auditTokenMin, { from: owner });
            await token.approve(members.address, auditTokenMin, { from: enterprise1 });
            await members.stake(auditTokenMin, { from: enterprise1 });
            let result = await cohortContract.methods.initializeValidation(documentHash, "url").send({ from: enterprise1, gas: 200000 });

            let validationInitTime = result.events.ValidationInitialized.returnValues.initTime;

            await cohortContract.methods.validate(documentHash, validationInitTime, 2).send({ from: validator1, gas: 200000 });
            await cohortContract.methods.validate(documentHash, validationInitTime, 2).send({ from: validator2, gas: 200000 });
            await cohortContract.methods.validate(documentHash, validationInitTime, 2).send({ from: validator3, gas: 200000 });

            let values = result.events.ValidationInitialized.returnValues;
            let validationHash = values.validationHash;

            try {
                result = await rules.mintTo(validationHash, cohortAddress, { from: enterprise1 });
            }
            catch (error) {
                ensureException(error);
            }

        })

    })
})

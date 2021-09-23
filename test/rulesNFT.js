import { assert } from 'chai';
import { en } from 'ethers/wordlists';


const NFT = artifacts.require('./RulesERC721Token.sol');
const MEMBERS = artifacts.require('../Members');
const TOKEN = artifacts.require('../AuditToken');
const COHORTFACTORY = artifacts.require('../CohortFactory');
const MEMBER_HELPERS = artifacts.require('../MemberHelpers');
const NODE_OPERATIONS = artifacts.require('../NodeOperations');
const DEPOSIT_MODIFIERS = artifacts.require('../DepositModifiers');
const VALIDATION = artifacts.require('../ValidationsCohort');



const Cohort = artifacts.require('../ValidationsCohort');
// const CREATECOHORT = artifacts.require('../CreateCohort');

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
    let memberHelpers;
    let nodeOperations;
    let depositModifiers;
    let validation;
    // let createCohort;
    let cohortAddress;
    let cohortContract;


    beforeEach(async () => {
        // await rules.grantRole(CONTROLLER_ROLE, owner, { from: owner });

        token = await TOKEN.new(owner);

        members = await MEMBERS.new(platformAccount);

        // createCohort = await CREATECOHORT.new(members.address, token.address)
        memberHelpers = await MEMBER_HELPERS.new(members.address, token.address)

        cohortFactory = await COHORTFACTORY.new(members.address, memberHelpers.address);

        nodeOperations = await NODE_OPERATIONS.new(memberHelpers.address, token.address);
        depositModifiers = await DEPOSIT_MODIFIERS.new(members.address, token.address, memberHelpers.address, cohortFactory.address, nodeOperations.address)
        validation = await VALIDATION.new(members.address, memberHelpers.address, cohortFactory.address, depositModifiers.address, nodeOperations.address)


        rules = await NFT.new(tokenName, tokenSymbol, validation.address);

        // let CONTROLLER_ROLE = web3.utils.keccak256("CONTROLLER_ROLE");
        await members.grantRole(CONTROLLER_ROLE, owner, { from: owner });
        await nodeOperations.grantRole(CONTROLLER_ROLE, validation.address, { from: owner });
        await token.grantRole(CONTROLLER_ROLE, nodeOperations.address, { from: owner });
        await depositModifiers.grantRole(CONTROLLER_ROLE, validation.address, { from: owner });

        await memberHelpers.grantRole(CONTROLLER_ROLE, validation.address, { from: owner });
        await memberHelpers.grantRole(CONTROLLER_ROLE, nodeOperations.address, { from: owner });
        await memberHelpers.grantRole(CONTROLLER_ROLE, depositModifiers.address, { from: owner });

        await token.grantRole(CONTROLLER_ROLE, depositModifiers.address, { from: owner });




        // await memberHelpers.setCohortFactory(cohortFactory.address, { from: owner });
        // await createCohort.grantRole(CONTROLLER_ROLE, cohortFactory.address, { from: owner });

        await members.addUser(enterprise1, "Enterprise 1", 0, { from: owner });
        await members.addUser(validator1, "Validators 1", 1, { from: owner });
        await members.addUser(validator2, "Validators 2", 1, { from: owner });
        await members.addUser(validator3, "Validators 3", 1, { from: owner });

        await token.transfer(validator1, auditTokenMin, { from: owner });
        await token.transfer(validator2, auditTokenMin, { from: owner });
        await token.transfer(validator3, auditTokenMin, { from: owner });
        await token.transfer(enterprise1, auditTokenMin, { from: owner });

        await token.approve(memberHelpers.address, auditTokenMin, { from: validator1 });
        await token.approve(memberHelpers.address, auditTokenMin, { from: validator2 });
        await token.approve(memberHelpers.address, auditTokenMin, { from: validator3 });

        await memberHelpers.stake(auditTokenMin, { from: validator1 });
        await memberHelpers.stake(auditTokenMin, { from: validator2 });
        await memberHelpers.stake(auditTokenMin, { from: validator3 });

        await nodeOperations.toggleNodeOperator({ from: validator1 });
        await nodeOperations.toggleNodeOperator({ from: validator2 });
        await nodeOperations.toggleNodeOperator({ from: validator3 });

        await cohortFactory.inviteValidatorMultiple([validator1, validator2, validator3], 1, { from: enterprise1 });

        await cohortFactory.acceptInvitation(enterprise1, 0, { from: validator1 });
        await cohortFactory.acceptInvitation(enterprise1, 1, { from: validator2 });
        await cohortFactory.acceptInvitation(enterprise1, 2, { from: validator3 });

        await cohortFactory.createCohort(1, { from: enterprise1 });


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
        let validationHash;
        let validationInitTime;
        let documentHash;

        beforeEach(async () => {

            documentHash = web3.utils.soliditySha3("2+2=4");
            await token.transfer(enterprise1, auditTokenMin, { from: owner });
            await token.approve(memberHelpers.address, auditTokenMin, { from: enterprise1 });
            await memberHelpers.stake(auditTokenMin, { from: enterprise1 });
            let result = await validation.initializeValidationCohort(documentHash, 'url', 1, { from: enterprise1 });
            let event = result.logs[0];
            validationHash = event.args.validationHash;
            validationInitTime = event.args.initTime;

        })

        it('It should fail minting of  1 token to enterprise1 with valid hash id but before validation has been done ', async () => {

            try {
                result = await rules.mintTo(validationHash, { from: enterprise1 })
                expectRevert();
            }
            catch (error) {
                ensureException(error);
            }
        })


        it('It should succeed minting of 1 token to enterprise1 with valid hash id and successful verification ', async () => {

            await validation.validate(documentHash, validationInitTime, 1, "", { from: validator1, gas: 800000 });
            await validation.validate(documentHash, validationInitTime, 1, "", { from: validator2, gas: 800000 });
            await validation.validate(documentHash, validationInitTime, 1, "", { from: validator3, gas: 800000 });


            let result = await rules.mintTo(validationHash, { from: enterprise1 });
            let event = result.logs[1];
            assert.equal(event.event, 'Mint');
            let tokenId = event.args.tokenId;
            let recipient = event.args.recipient;

            assert.strictEqual(tokenId.toString(), "1");
            assert.strictEqual(recipient, enterprise1);
        })


        it('It should fail minting the same token twice for one rule ', async () => {

            await validation.validate(documentHash, validationInitTime, 1, "", { from: validator1, gas: 800000 });
            await validation.validate(documentHash, validationInitTime, 1, "", { from: validator2, gas: 800000 });
            await validation.validate(documentHash, validationInitTime, 1, "", { from: validator3, gas: 800000 });


            let result = await rules.mintTo(validationHash, { from: enterprise1 });

            try {
                result = await rules.mintTo(validationHash, { from: enterprise1 });
                expectRevert();
            }
            catch (error) {
                ensureException(error);
            }

        })


        it('It should fail minting of 1 token to enterprise1 with valid hash id but unsuccessful verification ', async () => {

            await validation.validate(documentHash, validationInitTime, 2, "", { from: validator1, gas: 800000 });
            await validation.validate(documentHash, validationInitTime, 2, "", { from: validator2, gas: 800000 });
            await validation.validate(documentHash, validationInitTime, 2, "", { from: validator3, gas: 800000 });


            try {
                await rules.mintTo(validationHash, { from: enterprise1 });
                expectRevert();
            }
            catch (error) {
                ensureException(error);
            }

        })

    })
})

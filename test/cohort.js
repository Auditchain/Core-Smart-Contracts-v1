import {
    ensureException,
    duration
} from './helpers/utils.js';


const MEMBERS = artifacts.require('../Members');
const TOKEN = artifacts.require('../AuditToken');
const COHORTFACTORY = artifacts.require('../CohortFactory');
const MEMBER_HELPERS = artifacts.require('../MemberHelpers');
const NODE_OPERATIONS = artifacts.require('../NodeOperations');
const DEPOSIT_MODIFIERS = artifacts.require('../DepositModifiers');
const VALIDATION = artifacts.require('../ValidationsCohort');
const VALIDATION_HELPERS = artifacts.require('../ValidationHelpers')
const QUEUE = artifacts.require("../Queue");

import expectRevert from './helpers/expectRevert';
import { assert } from 'chai';
let BN = require("big-number");
const timeMachine = require('ganache-time-traveler');





contract("Cohort validation contract", (accounts) => {

    const admin = accounts[0];
    const enterprise1 = accounts[1];
    const validator1 = accounts[2];
    const validator2 = accounts[3];
    const validator3 = accounts[4];
    const validator4 = accounts[5];
    const platformAccount = accounts[6];
    const dataSubscriber = accounts[7];
    const documentURL = "http://xbrlsite.azurewebsites.net/2021/reporting-scheme/proof/reference-implementation/instance.xml"


    let members;
    let token;
    let memberHelpers;
    let cohortFactory;
    let nodeOperations;
    let depositModifiers;
    let validation;
    let documentHash;

    let auditTokenMin = "5000000000000000000000";
    let price = "1000000000000000000";


    let validationInitTime;
    let validationHash;
    let validationHelpers;
    let queue;



    const tokenAmount1 = "9000000000000000000000000";
    const tokenAmount2 = "8500000000000000000000000";
    const tokenAmount3 = "10000000000000000000000000";
    const tokenAmount4 = "44443332220000000000000000";
    const tokenAmount5 = "14443332220000000000000000";


    beforeEach(async () => {





        token = await TOKEN.new(admin);
        members = await MEMBERS.new(platformAccount);
        memberHelpers = await MEMBER_HELPERS.new(members.address, token.address);
        cohortFactory = await COHORTFACTORY.new(members.address, memberHelpers.address);
        nodeOperations = await NODE_OPERATIONS.new(memberHelpers.address, token.address, members.address);
        depositModifiers = await DEPOSIT_MODIFIERS.new(members.address, token.address, memberHelpers.address, cohortFactory.address, nodeOperations.address)
        validationHelpers = await VALIDATION_HELPERS.new(memberHelpers.address);
        queue = await QUEUE.new();
        validation = await VALIDATION.new(members.address, memberHelpers.address, cohortFactory.address, depositModifiers.address, nodeOperations.address, validationHelpers.address, queue.address)



        let CONTROLLER_ROLE = web3.utils.keccak256("CONTROLLER_ROLE");
        await members.grantRole(CONTROLLER_ROLE, admin, { from: admin });

        await nodeOperations.grantRole(CONTROLLER_ROLE, validation.address, { from: admin });
        await token.grantRole(CONTROLLER_ROLE, nodeOperations.address, { from: admin });
        await depositModifiers.grantRole(CONTROLLER_ROLE, validation.address, { from: admin });

        await memberHelpers.grantRole(CONTROLLER_ROLE, validation.address, { from: admin });
        await memberHelpers.grantRole(CONTROLLER_ROLE, admin, { from: admin });

        await memberHelpers.grantRole(CONTROLLER_ROLE, nodeOperations.address, { from: admin });
        await memberHelpers.grantRole(CONTROLLER_ROLE, depositModifiers.address, { from: admin });

        await token.grantRole(CONTROLLER_ROLE, depositModifiers.address, { from: admin });
        await token.grantRole(CONTROLLER_ROLE, memberHelpers.address, { from: admin });

        await memberHelpers.setValidation(validation.address, { from: admin });

        await members.addUser(validator1, "Validators 1", 1, { from: admin });
        await members.addUser(validator2, "Validators 2", 1, { from: admin });
        await members.addUser(validator3, "Validators 3", 1, { from: admin });
        await members.addUser(validator4, "Validators 4", 1, { from: admin });
        await members.addUser(enterprise1, "Enterprise 1", 0, { from: admin });

        await token.transfer(validator1, tokenAmount1);
        await token.transfer(validator2, tokenAmount2);
        await token.transfer(validator3, tokenAmount3);
        await token.transfer(validator4, tokenAmount4);
        await token.transfer(enterprise1, tokenAmount5);

        await token.approve(memberHelpers.address, auditTokenMin, { from: validator1 });
        await token.approve(memberHelpers.address, auditTokenMin, { from: validator2 });
        await token.approve(memberHelpers.address, auditTokenMin, { from: validator3 });
        await token.approve(memberHelpers.address, auditTokenMin, { from: validator4 });
        await token.approve(memberHelpers.address, auditTokenMin, { from: enterprise1 });



        await memberHelpers.stake(auditTokenMin, { from: validator1 });
        await memberHelpers.stake(auditTokenMin, { from: validator2 });
        await memberHelpers.stake(auditTokenMin, { from: validator3 });
        await memberHelpers.stake(auditTokenMin, { from: validator4 });
        await memberHelpers.stake(auditTokenMin, { from: enterprise1 });

        await nodeOperations.toggleNodeOperator({ from: validator1 });
        await nodeOperations.toggleNodeOperator({ from: validator2 });
        await nodeOperations.toggleNodeOperator({ from: validator3 });


        await cohortFactory.inviteValidator(validator1, 1, { from: enterprise1 });
        await cohortFactory.inviteValidator(validator2, 1, { from: enterprise1 });
        await cohortFactory.inviteValidator(validator3, 1, { from: enterprise1 });

        await cohortFactory.acceptInvitation(enterprise1, 0, { from: validator1 });
        await cohortFactory.acceptInvitation(enterprise1, 1, { from: validator2 });
        await cohortFactory.acceptInvitation(enterprise1, 2, { from: validator3 });

        await cohortFactory.createCohort(1, { from: enterprise1 });

        documentHash = web3.utils.soliditySha3("2+2=5");

        let result = await validation.initializeValidationCohort(documentHash, documentURL, 1, price, { from: enterprise1 });
        let event = result.logs[0];
        assert.equal(event.event, 'ValidationInitialized');
        validationInitTime = event.args.initTime;
        validationHash = web3.utils.soliditySha3(documentHash, validationInitTime, enterprise1);

    })


    // describe("Deploy", async () => {

    //     it("Should succeed. validation deployed and initialized", async () => {

    //         let memberAddress = await validation.members();
    //         let memberHelperAddress = await validation.memberHelpers();
    //         assert.strictEqual(memberAddress, members.address);
    //         assert.strictEqual(memberHelperAddress, memberHelpers.address);

    //     })
    // })


    // describe("Initialize validation", async () => {

    //     it("Should succeed. Validation initialized by registered user who has sufficient funds", async () => {


    //         let result = await validation.initializeValidationCohort(documentHash, documentURL, 1, price, { from: enterprise1 });

    //         let event = result.logs[0];
    //         assert.equal(event.event, 'ValidationInitialized');

    //         let validationTime = event.args.initTime;
    //         let validationHash = web3.utils.soliditySha3(documentHash, validationTime, enterprise1);

    //         assert.strictEqual(event.args.validationHash, validationHash);
    //         assert.strictEqual(event.args.user, enterprise1);

    //     })

    //     it("Should fail. Validation initialized by not registered user.", async () => {

    //         try {
    //             let result = await validation.initializeValidationCohort(documentHash, documentURL, 1, price, { from: admin });
    //             expectRevert();
    //         }
    //         catch (error) {
    //             ensureException(error);
    //         }
    //     })

    //     it("Should fail. Validation initialized by registered user with no funds", async () => {

    //         let deposit = await memberHelpers.returnDepositAmount(enterprise1);
    //         let mintedPerValidation = await members.amountTokensPerValidation();
    //         let enterpriseMatch = await members.enterpriseMatch();
    //         let enterprisePortion = mintedPerValidation * enterpriseMatch / 100;

    //         await memberHelpers.redeem(BN(deposit.toString()).minus(BN(enterprisePortion.toString()).minus("1")).toString(), { from: enterprise1 });

    //         try {
    //             await validation.initializeValidationCohort(documentHash, documentURL, 1, price, { from: enterprise1 });
    //             expectRevert();
    //         }
    //         catch (error) {
    //             ensureException(error);
    //         }
    //     })
    // })

    describe("Validate document", async () => {

        let validationInitTime;
        let documentHash;

        beforeEach(async () => {

            documentHash = web3.utils.soliditySha3("2+2=4");
            let result = await validation.initializeValidationCohort(documentHash, documentURL, 1, price, { from: enterprise1 });
            let event = result.logs[0];
            assert.equal(event.event, 'ValidationInitialized');
            validationInitTime = event.args.initTime;

        })

        it("Should succeed. Validation executed by proper validator and proper values are passed", async () => {

            let result = await validation.validate(documentHash, validationInitTime, enterprise1, 1, "", documentHash, { from: validator1, gas: 900000 });
            let result = await validation.validate(documentHash, validationInitTime, dataSubscriber, 1, "", documentURL, documentHash, { from: validator1, gas: 900000 });

            let event = result.logs[0];
            assert.equal(event.event, 'ValidatorValidated');
            assert.strictEqual(event.args.decision.toString(), "1");
            assert.strictEqual(event.args.documentHash, documentHash);

        })

        it("Should fail. Validation attested by proper validator but improper document hash is sent.", async () => {


            documentHash = web3.utils.soliditySha3("2+1=4");
            try {
                await validation.validate(documentHash, validationInitTime, enterprise1, 1, "", documentHash, { from: validator1, gas: 900000 });

                expectRevert();
            } catch (error) {
                ensureException(error);
            }
        })

        it("Should fail. Validation attested by proper validator but improper validation time is sent.", async () => {

            try {
                await validation.validate(documentHash, 123, enterprise1, 1, "", documentHash, { from: validator1, gas: 900000 });

                expectRevert();
            } catch (error) {
                ensureException(error);
            }
        })

        it("Should fail. Validation attested by improper validator while all params are correct.", async () => {

            try {
                await validation.validate(documentHash, validationInitTime, enterprise1, 1, "", documentHash, { from: admin, gas: 900000 });
                expectRevert();
            } catch (error) {
                ensureException(error);
            }

        })

        it("Should succeed. Validation executed by all validators should result in sum of payments to each validation", async () => {



            // execute first validation for the sake of estabilishing number of validators
            await validation.validate(documentHash, validationInitTime, enterprise1, 1, "", documentHash, { from: validator1, gas: 900000 });
            await validation.validate(documentHash, validationInitTime, enterprise1, 1, "", documentHash, { from: validator2, gas: 900000 });
            await validation.validate(documentHash, validationInitTime, enterprise1, 1, "", documentHash, { from: validator3, gas: 900000 });
            await validation.validate(documentHash, validationInitTime, dataSubscriber, 1, documentURL, documentHash, { from: validator1, gas: 900000 });


            let depositAmountBefore1 = await memberHelpers.deposits(validator1);
            let depositAmountBefore2 = await memberHelpers.deposits(validator2);
            let depositAmountBefore3 = await memberHelpers.deposits(validator3);

            // create actual test
            documentHash = web3.utils.soliditySha3("2+3=4");
            let result = await validation.initializeValidationCohort(documentHash, documentURL, 1, price, { from: enterprise1 });
            let event = result.logs[0];
            assert.equal(event.event, 'ValidationInitialized');
            validationInitTime = event.args.initTime;


            await validation.validate(documentHash, validationInitTime, enterprise1, 1, "", documentHash, { from: validator1, gas: 900000 });
            await validation.validate(documentHash, validationInitTime, enterprise1, 1, "", documentHash, { from: validator2, gas: 900000 });
            result = await validation.validate(documentHash, validationInitTime, enterprise1, 1, "", documentHash, { from: validator3, gas: 900000 });
            // timeMachine.advanceTimeAndBlock(10);

            event = result.logs[1];
            assert.equal(event.event, 'RequestExecuted');

            validation.voteWinner(event.args.winners, [true, true, true], event.args.validationHash, { from: validator1 });
            validation.voteWinner(event.args.winners, [true, true, true], event.args.validationHash, { from: validator2 });
            validation.voteWinner(event.args.winners, [true, true, true], event.args.validationHash, { from: validator3 });


            let depositAmountAfter1 = await memberHelpers.deposits(validator1);
            let depositAmountAfter2 = await memberHelpers.deposits(validator2);
            let depositAmountAfter3 = await memberHelpers.deposits(validator3);

            let earned1 = BN(depositAmountAfter1.toString()).minus(BN(depositAmountBefore1.toString()));
            let earned2 = BN(depositAmountAfter2.toString()).minus(BN(depositAmountBefore2.toString()));
            let earned3 = BN(depositAmountAfter3.toString()).minus(BN(depositAmountBefore3.toString()));


            let mintedPerValidation = await members.amountTokensPerValidation();
            let enterpriseMatch = await members.enterpriseMatch();
            let platformFeePercantage = await members.platformShareValidation();
            let enterprisePortion = mintedPerValidation * enterpriseMatch / 100;
            let platformPortion = mintedPerValidation * platformFeePercantage / 100;
            let validatorAmount = BN(mintedPerValidation.toString()).add(enterprisePortion.toString()).minus(platformPortion.toString());
            let total = BN(earned1.toString()).add(earned2.toString()).add(earned3.toString());

            assert.strictEqual(total.toString(), validatorAmount.toString());

        })
    })

    describe("Check if validator has validated specific document", async () => {

        let validationInitTime;
        let validationHash

        beforeEach(async () => {

            documentHash = web3.utils.soliditySha3("2+2=4");
            let result = await validation.initializeValidationCohort(documentHash, documentURL, 1, price, { from: enterprise1 });
            let event = result.logs[0];
            assert.equal(event.event, 'ValidationInitialized');
            validationInitTime = event.args.initTime;
            validationHash = web3.utils.soliditySha3(documentHash, validationInitTime, enterprise1);

        })


        it("It should succeed. The return value should be true.", async () => {

            await validation.validate(documentHash, validationInitTime, enterprise1, 1, "", documentHash, { from: validator1, gas: 900000 });

            let isValidated = await validation.isValidated(validationHash, { from: validator1 });

            assert.strictEqual(isValidated.toString(), "1");
        })

        it("It should succeed. The return value should be false.", async () => {
            let isValidated = await validation.isValidated(validationHash, { from: validator1 });

            assert.strictEqual(isValidated.toString(), "0");
        })
    })



    describe("Calculate Vote Quorum", async () => {

        let validationInitTime;
        let validationHash

        beforeEach(async () => {

            documentHash = web3.utils.soliditySha3("2+2=4");
            let result = await validation.initializeValidationCohort(documentHash, documentURL, 1, price, { from: enterprise1 });
            let event = result.logs[0];
            assert.equal(event.event, 'ValidationInitialized');
            validationInitTime = event.args.initTime;
            validationHash = web3.utils.soliditySha3(documentHash, validationInitTime, enterprise1);

        })

        it("Should succeed. Calculation is done against valid validation.", async () => {

            await validation.validate(documentHash, validationInitTime, enterprise1, 1, "", documentHash, { from: validator1, gas: 900000 });
            let quorum = await validationHelpers.calculateVoteQuorum(validationHash, validation.address);
            assert.strictEqual(quorum.toString(), "33");
        })

        it("Should fail. Calculation is done against valid validation with wrong time. ", async () => {

            try {
                await validation.validate(documentHash, 1, enterprise1, 1, "", documentHash, { from: validator1, gas: 900000 });
                expectRevert();
            } catch (error) {
                ensureException(error);
            }
        })
    })

    describe("Collect Validation Results", async () => {


        it("Should succeed. CollectValidationResults properly returns results", async () => {

            let val = await validation.validate(documentHash, validationInitTime, enterprise1, 2, "", documentHash, { from: validator1, gas: 900000 });
            let event = val.logs[0];
            assert.equal(event.event, 'ValidatorValidated');
            let validationTime = event.args.validationTime;

            let status = await validation.collectValidationResults(validationHash);

            assert.strictEqual(status[0][0], validator1);
            assert.strictEqual(status[1][0].toString(), auditTokenMin);
            assert.strictEqual(status[2][0].toString(), "2");
            assert.strictEqual(status[3][0].toString(), validationTime.toString());
        })

        it("Should succeed. determineConsensus properly determines consensus", async () => {

            let result = await validationHelpers.determineConsensus([1, 1, 1, 2]);
            assert.strictEqual(result.toString(), "1");
        })
    })


})
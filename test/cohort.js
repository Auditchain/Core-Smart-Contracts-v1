import {
    ensureException,
    duration
} from './helpers/utils.js';

const MEMBERS = artifacts.require('../Members');
const TOKEN = artifacts.require('../AuditToken');
const COHORT = artifacts.require('../ValidationsCohort');
const MEMBER_HELPERS = artifacts.require('../MemberHelpers');
const COHORT_FACTORY = artifacts.require('../CohortFactory')


import expectRevert from './helpers/expectRevert';
import { assert } from 'chai';
let BN = require("big-number");
const timeMachine = require('ganache-time-traveler');





contract("cohort contract", (accounts) => {

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
    let cohort;
    let cohortFactory;
    let documentHash;

    let auditTokenMin = "5000000000000000000000";
    let rewardTokensHalf = "341500000000000000000";
    let rewardTokens = "1000000000000000000";

    let cohortAddress;
    let cohortContract;
    let result;
    let SETTER_ROLE = web3.utils.keccak256("SETTER_ROLE");
    let CONTORLLER_ROLE = web3.utils.keccak256("CONTORLLER_ROLE");


    const tokenAmount1 = "9000000000000000000000000";
    const tokenAmount2 = "8500000000000000000000000";
    const tokenAmount3 = "10000000000000000000000000";
    const tokenAmount4 = "44443332220000000000000000";
    const tokenAmount5 = "14443332220000000000000000";


    beforeEach(async () => {

        token = await TOKEN.new(admin);
        members = await MEMBERS.new(token.address);
        memberHelpers = await MEMBER_HELPERS.new(members.address, token.address);
        cohortFactory = await COHORT_FACTORY.new(members.address, memberHelpers.address);
        cohort = await COHORT.new(token.address, members.address, memberHelpers.address, cohortFactory.address);


        let CONTROLLER_ROLE = web3.utils.keccak256("CONTROLLER_ROLE");
        await members.grantRole(CONTROLLER_ROLE, admin, { from: admin });

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

        // console.log("deposit 4",  (await memberHelpers.returnDepositAmount(validator4)).toString());

        await cohortFactory.inviteValidator(validator1, 0, { from: enterprise1 });
        await cohortFactory.inviteValidator(validator2, 0, { from: enterprise1 });
        await cohortFactory.inviteValidator(validator3, 0, { from: enterprise1 });
        // await cohortFactory.inviteValidator(validator4, 0, { from: enterprise1 });

        await cohortFactory.acceptInvitation(enterprise1, 0, { from: validator1 });
        await cohortFactory.acceptInvitation(enterprise1, 1, { from: validator2 });
        await cohortFactory.acceptInvitation(enterprise1, 2, { from: validator3 });
        // await cohortFactory.acceptInvitation(enterprise1, 3, { from: validator4 });




        result = await cohortFactory.createCohort(0, { from: enterprise1 });

        assert.lengthOf(result.logs, 1);

        let event = result.logs[0];
        assert.equal(event.event, 'CohortCreated');

        await memberHelpers.grantRole(CONTROLLER_ROLE, admin, { from: admin });
        await memberHelpers.grantRole(CONTROLLER_ROLE, cohort.address, { from: admin });

        await token.grantRole(CONTROLLER_ROLE, memberHelpers.address, { from: admin });

        await memberHelpers.setCohortFactory(cohortFactory.address, { from: admin });
        await memberHelpers.setCohort(cohort.address, { from: admin });


        // cohortAddress = event.args.cohort;
        // cohortContract = new web3.eth.Contract(Cohort["abi"], cohortAddress);

        // await cohortContract.methods.grantRole(CONTROLLER_ROLE, owner).send({ from: owner });
        // await token.grantRole(CONTROLLER_ROLE, cohortAddress, { from: owner });


        documentHash = web3.utils.soliditySha3(documentURL);
        // await memberHelpers.grantRole(CONTROLLER_ROLE, cohort.address, { from: admin });


    })


    describe("Deploy", async () => {

        it("Should succeed. cohort deployed and initialized", async () => {

            let tokenAddress = await cohort.auditToken();
            let memberAddress = await cohort.members();
            let memberHelperAddress = await cohort.memberHelpers();
            assert.strictEqual(tokenAddress, token.address);
            assert.strictEqual(memberAddress, members.address);
            assert.strictEqual(memberHelperAddress, memberHelpers.address);

        })
    })


    describe("Test simple updates", async () => {

        it("It should succeed. Quorum amount was updated by authorized user.", async () => {


            await cohort.grantRole(SETTER_ROLE, admin, { from: admin });
            await cohort.updateQuorum("20", { from: admin });
            let newQuorum = await cohort.requiredQuorum();
            assert.strictEqual(newQuorum.toString(), "20");
        })


        it("It should fail. Quorum amount was updated by unauthorized user.", async () => {

            try {
                await cohort.updateQuorum("20", { from: admin });
                expectRevert();

            }
            catch (error) {
                ensureException(error);
            }
        })
    })



    describe("Initialize validation", async () => {

        it("Should succeed. Validation initialized by registered user who has sufficient funds", async () => {

            let result = await cohort.initializeValidationCohort(documentHash, documentURL, 0,  { from: enterprise1 });

            let event = result.logs[0];
            assert.equal(event.event, 'ValidationInitialized');

            let validationTime = event.args.initTime;
            let validationHash = web3.utils.soliditySha3(documentHash, validationTime);

            assert.strictEqual(event.args.validationHash, validationHash);
            assert.strictEqual(event.args.user, enterprise1);

        })

        it("Should fail. Validation initialized by not registered user.", async () => {

            try {
                let result = await cohort.initializeValidationCohort(documentHash, documentURL, 0, { from: admin });
                expectRevert();
            }
            catch (error) {
                ensureException(error);
            }
        })


        it("Should fail. Validation initialized by registered user with no funds", async () => {

            await memberHelpers.redeem(auditTokenMin, { from: enterprise1 });

            try {
                await cohort.initializeValidationCohort(documentHash, documentURL, 0, { from: enterprise1 });
                expectRevert();
            }
            catch (error) {
                ensureException(error);
            }
        })
    })

    describe("Validate document", async () => {

        let validationInitTime;

        beforeEach(async () => {

            // await cohortFactory.createCohort(0, { from: enterprise1 });

            let result = await cohort.initializeValidationCohort(documentHash, documentURL, 0,  { from: enterprise1 });
            let event = result.logs[0];
            assert.equal(event.event, 'ValidationInitialized');
            validationInitTime = event.args.initTime;

        })

        it("Should succeed. Validation executed by proper validator and proper values are passed", async () => {

            let result = await cohort.validate(documentHash, validationInitTime, 1, { from: validator1, gas: 200000 });

            let event = result.logs[0];
            assert.equal(event.event, 'ValidatorValidated');

            assert.strictEqual(event.args.decision.toString(), "1");
            assert.strictEqual(event.args.documentHash, documentHash);
        it("Should fail. Validation attested by proper validator but improper document hash is sent.", async () => {

            documentHash = web3.utils.soliditySha3("1");


            try {
                await cohort.validate(documentHash, validationInitTime, 1, { from: validator1, gas: 200000 });

                expectRevert();
            } catch (error) {
                ensureException(error);
            }
        })

        })


        it("Should fail. Validation attested by proper validator but improper validation time is sent.", async () => {

            try {
                await cohort.validate(documentHash, 123, 1, { from: validator1, gas: 200000 });

                expectRevert();
            } catch (error) {
                ensureException(error);
            }
        })


        it("Should fail. Validation attested by improper validator while all params are correct.", async () => {

            try {
                await cohort.validate(documentHash, validationInitTime, 1, { from: admin, gas: 200000 });
                expectRevert();
            } catch (error) {
                ensureException(error);
            }

        })


        it("Should succeed. Validation executed by all validators should result in sum of payments to each validation", async () => {


            let depositAmountBefore1 = await memberHelpers.deposits(validator1);
            let depositAmountBefore2 = await memberHelpers.deposits(validator2);
            let depositAmountBefore3 = await memberHelpers.deposits(validator3);


            await cohort.validate(documentHash, validationInitTime, 1, { from: validator1, gas: 500000 });
            
            await cohort.validate(documentHash, validationInitTime, 1, { from: validator2, gas: 500000 });
            await cohort.validate(documentHash, validationInitTime, 1, { from: validator3, gas: 500000 });
            // timeMachine.advanceTimeAndBlock(10);


            let depositAmountAfter1 = await memberHelpers.deposits(validator1);
            let depositAmountAfter2 = await memberHelpers.deposits(validator2);
            let depositAmountAfter3 = await memberHelpers.deposits(validator3);

            let earned1 = BN(depositAmountAfter1.toString()).minus(BN(depositAmountBefore1.toString()));
            let earned2 = BN(depositAmountAfter2.toString()).minus(BN(depositAmountBefore2.toString()));
            let earned3 = BN(depositAmountAfter3.toString()).minus(BN(depositAmountBefore3.toString()));

            let mintedPerValidation = await members.amountTokensPerValidation();
            let enterpriseMatch = await members.enterpriseMatch(enterprise1);
            let platformFeePercantage = await members.platformShareValidation();
            let enterprisePortion = mintedPerValidation * enterpriseMatch / 100;
            let platformPortion = mintedPerValidation * platformFeePercantage / 100;
            let validatorAmount = BN(mintedPerValidation.toString()).add(enterprisePortion.toString()).minus(platformPortion.toString());
            let total = BN(earned1.toString()).add(earned2.toString()).add(earned3.toString());

            // console.log("total:", total.toString());
            // console.log("fee:", validatorAmount.toString());
            // console.log("earned1:", earned1.toString());
            // console.log("earned2:", earned2.toString());
            // console.log("earned3:", earned3.toString());
            // console.log("earned4:", earned4.toString());


            assert.strictEqual(total.toString(), validatorAmount.toString());

        })

    })

    describe("Check if validator has validated specific document", async () => {

        let validationInitTime;
        let validationHash

        beforeEach(async () => {

            let result = await cohort.initializeValidationCohort(documentHash, documentURL, 0, { from: enterprise1 });

            let event = result.logs[0];
            assert.equal(event.event, 'ValidationInitialized');
            validationInitTime = event.args.initTime;
            validationHash = web3.utils.soliditySha3(documentHash, validationInitTime);

        })


        it("It should succeed. The return value should be true.", async () => {

            await cohort.validate(documentHash, validationInitTime, 1, { from: validator1, gas: 200000 });
            let isValidated = await cohort.isValidated(validationHash, { from: validator1 });

            assert.strictEqual(isValidated.toString(), "1");
        })

        it("It should succeed. The return value should be false.", async () => {
            let isValidated = await cohort.isValidated(validationHash, { from: validator1 });

            assert.strictEqual(isValidated.toString(), "0");
        })
    })



    describe("Calculate Vote Quorum", async () => {

        let validationInitTime;
        let validationHash

        beforeEach(async () => {

            let result = await cohort.initializeValidationCohort(documentHash, documentURL, 0, { from: enterprise1 });

            let event = result.logs[0];
            assert.equal(event.event, 'ValidationInitialized');
            validationInitTime = event.args.initTime;
            validationHash = web3.utils.soliditySha3(documentHash, validationInitTime);

        })


        it("Should succeed. Calculation is done against valid validation.", async () => {

            await cohort.validate(documentHash, validationInitTime, 1, { from: validator1, gas: 200000 });

            let quorum = await cohort.calculateVoteQuorum(validationHash);

            assert.strictEqual(quorum.toString(), "33");
        })

        it("Should fail. Calculation is done against valid validation with wrong time. ", async () => {

            validationHash = web3.utils.soliditySha3(documentHash, 1);

            try {
                await cohort.calculateVoteQuorum(validationHash);
                expectRevert();
            } catch (error) {

                ensureException(error);
            }
        })
    })

    describe("Collect Validation Results", async () => {

        let validationInitTime;
        let validationHash

        beforeEach(async () => {

            let result = await cohort.initializeValidationCohort(documentHash, documentURL, 0, { from: enterprise1 });

            let event = result.logs[0];
            assert.equal(event.event, 'ValidationInitialized');
            validationInitTime = event.args.initTime;
            validationHash = web3.utils.soliditySha3(documentHash, validationInitTime);

        })


        it("Should succeed. CollectValidationResults properly returns results", async () => {

            await cohort.validate(documentHash, validationInitTime, 2, { from: validator1, gas: 200000 });
            let status = await cohort.collectValidationResults(validationHash);

            assert.strictEqual(status[0][0], validator1);
            assert.strictEqual(status[1][0].toString(), auditTokenMin);
            assert.strictEqual(status[2][0].toString(), "2");
            assert.strictEqual(status[3][0].toString(), validationInitTime.toString());
        })

        it("Should succeed. determineConsensus properly determins consensus", async () => {

            let result = await cohort.determineConsensus([1, 1, 1, 2]);
            assert.strictEqual(result.toString(), "1");
        })
    })


})
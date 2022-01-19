import { assert } from 'chai';
import { en } from 'ethers/wordlists';
import {
    ensureException,
    duration
} from './helpers/utils.js';

const MEMBERS = artifacts.require('../Members');
const MEMBER_HELPERS = artifacts.require('../MemberHelpers')
const TOKEN = artifacts.require('../AuditToken');
const COHORTFACTORY = artifacts.require('../CohortFactory');
const VALIDATION = artifacts.require('../ValidationsCohort');
const NODE_OPERATIONS = artifacts.require('../NodeOperations');
const DEPOSIT_MODIFIERS = artifacts.require('../DepositModifiers');
const VALIDATION_HELPERS = artifacts.require('../ValidationHelpers')






var BigNumber = require('big-number');
let SETTER_ROLE = web3.utils.keccak256("SETTER_ROLE");
import expectRevert from './helpers/expectRevert';




contract("Member Helper contract", (accounts) => {

    const admin = accounts[0];
    const enterprise1 = accounts[1];
    const validator1 = accounts[3];
    const validator2 = accounts[4];
    const validator3 = accounts[5];
    const dataSubscriber = accounts[6];
    const platformAccount = accounts[7];
    const validator4 = accounts[8];


    let members;
    let token;
    let memberHelpers;
    let cohortFactory;
    let validationHelpers
    let validation;
    let nodeOperations;
    let depositModifiers;
    let CONTROLLER_ROLE;

    let auditTokenMin = "5000000000000000000000";
    let auditTokenLesMin = "1";
    let auditTokenMorMax = "25100000000000000000000";
    let auditTokenMax = "25000000000000000000000";

    let rewardTokens = "1000000000000000000";
    let tokenPerValidation;
    CONTROLLER_ROLE = web3.utils.keccak256("CONTROLLER_ROLE");

    beforeEach(async () => {

        token = await TOKEN.new(admin);
        members = await MEMBERS.new(platformAccount);
        memberHelpers = await MEMBER_HELPERS.new(members.address, token.address)

        cohortFactory = await COHORTFACTORY.new(members.address, memberHelpers.address);
        nodeOperations = await NODE_OPERATIONS.new(memberHelpers.address, token.address, members.address);
        validationHelpers = await VALIDATION_HELPERS.new(memberHelpers.address);
        depositModifiers = await DEPOSIT_MODIFIERS.new(members.address, token.address, memberHelpers.address, cohortFactory.address, nodeOperations.address)
        validation = await VALIDATION.new(members.address, memberHelpers.address, cohortFactory.address, depositModifiers.address, nodeOperations.address, validationHelpers.address)

        await memberHelpers.grantRole(CONTROLLER_ROLE, admin, { from: admin });
        await members.grantRole(CONTROLLER_ROLE, admin, { from: admin });
        await nodeOperations.grantRole(CONTROLLER_ROLE, validation.address, { from: admin });
        await memberHelpers.grantRole(CONTROLLER_ROLE, validation.address, { from: admin });
        await memberHelpers.grantRole(CONTROLLER_ROLE, nodeOperations.address, { from: admin });
        await memberHelpers.grantRole(CONTROLLER_ROLE, depositModifiers.address, { from: admin });

        await token.grantRole(CONTROLLER_ROLE, nodeOperations.address, { from: admin });
        await depositModifiers.grantRole(CONTROLLER_ROLE, validation.address, { from: admin });
        await token.grantRole(CONTROLLER_ROLE, depositModifiers.address, { from: admin });
        await token.grantRole(CONTROLLER_ROLE, memberHelpers.address, { from: admin });


        await memberHelpers.setValidation(validation.address, {from:admin});

        tokenPerValidation = await members.amountTokensPerValidation();


        // await memberHelpers.setCohortFactory(cohortFactory.address, { from: admin });



    })


    describe("Deploy", async () => {

        it("Should succeed. Initialize members with Audit token", async () => {
            let tokenAddress = await memberHelpers.auditToken();
            assert.strictEqual(tokenAddress, token.address);

        })
    })

    describe("Set Validation ", async () => {

        it("Should succeed. Validation address has been set", async () => {

            await memberHelpers.setValidation(validation.address);
            let validationAddress = await memberHelpers.validations();
            assert.strictEqual(validationAddress, validation.address);
        })

        it("Should fail. Validation address has been set by not authorized user", async () => {

            try {
                await memberHelpers.setValidation(validation.address, { from: validator2 });

                expectRevert()
            } catch (error) {
                ensureException(error);
            }
        })

        it("Should fail. Validation address has been set by authorized user, but with address 0", async () => {

            try {
                await memberHelpers.setValidation("0x0000000000000000000000000000000000000000", { from:admin });

                expectRevert()
            } catch (error) {
                ensureException(error);
            }
        })
    })


    describe("Stake by validators", async () => {

        beforeEach(async () => {

            // await members.addValidatorUser(validator1, "Validators 1", { from: admin });
            const result = await members.addUser(validator1, "Validator 1", 1, { from: admin });

            await token.transfer(validator1, auditTokenMin, { from: admin });
            await token.approve(memberHelpers.address, auditTokenMin, { from: validator1 });
        })

        it("Should succeed. Validator stakes tokens.", async () => {

            let result = await memberHelpers.stake(auditTokenMin, { from: validator1 });
            assert.lengthOf(result.logs, 1);

            let event = result.logs[0];
            assert.equal(event.event, 'LogDepositReceived');
            assert.strictEqual(event.args.from, validator1);
            assert.strictEqual(event.args.amount.toString(), auditTokenMin);
        })

        it("Should fail. User hasn't been registered as validator.", async () => {
            try {
                await memberHelpers.stake(auditTokenMin, { from: validator2 });
                expectRevert()
            } catch (error) {
                ensureException(error);
            }
        })

        it("Should fail. User contributed less than required amount.", async () => {

            try {
                let result = await memberHelpers.stake(auditTokenLesMin, { from: validator1 });
                expectRevert()
            } catch (error) {
                ensureException(error);
            }

        })

        it("Should fail. User contributed more than required amount.", async () => {

            await members.addUser(validator2, "Validator 2", 1, { from: admin });
            await token.transfer(validator2, auditTokenMorMax, { from: admin });
            await token.approve(memberHelpers.address, auditTokenMorMax, { from: validator2 });

            try {
                let result = await memberHelpers.stake(auditTokenMorMax, { from: validator2 });
                expectRevert()

            } catch (error) {
                ensureException(error);
            }

        })

    })

    describe("Deposit by Enterprise", async () => {

        beforeEach(async () => {

            await members.addUser(enterprise1, "Enterprise 1", 0, { from: admin });

            await token.transfer(enterprise1, auditTokenMin, { from: admin });
            await token.approve(memberHelpers.address, auditTokenMin, { from: enterprise1 });
        })

        it("Should succeed. Enterprise deposits tokens.", async () => {

            let result = await memberHelpers.stake(auditTokenMin, { from: enterprise1 });
            assert.lengthOf(result.logs, 1);

            let event = result.logs[0];
            assert.equal(event.event, 'LogDepositReceived');
            assert.strictEqual(event.args.from, enterprise1);
            assert.strictEqual(event.args.amount.toString(), auditTokenMin);
        })

        it("Should fail. User hasn't been registered as enterprise.", async () => {
            try {
                result = await memberHelpers.stake(auditTokenMin, { from: admin });
                expectRevert()
            } catch (error) {
                ensureException(error);
            }
        })
    })


    describe("Process earnings", async () => {

        let cohortAddress;
        let cohortContract;

        beforeEach(async () => {

            await members.addUser(enterprise1, "Enterprise 1", 0, { from: admin });
            await members.addUser(validator1, "Validators 1", 1, { from: admin });
            await members.addUser(validator2, "Validators 2", 1, { from: admin });
            await members.addUser(validator3, "Validators 3", 1, { from: admin });

            await token.transfer(validator1, auditTokenMin, { from: admin });
            await token.transfer(validator2, auditTokenMin, { from: admin });
            await token.transfer(validator3, auditTokenMin, { from: admin });
            await token.transfer(enterprise1, auditTokenMin, { from: admin });


            await token.approve(memberHelpers.address, auditTokenMin, { from: validator1 });
            await token.approve(memberHelpers.address, auditTokenMin, { from: validator2 });
            await token.approve(memberHelpers.address, auditTokenMin, { from: validator3 });
            await token.approve(memberHelpers.address, auditTokenMin, { from: enterprise1 });


            await memberHelpers.stake(auditTokenMin, { from: validator1 });
            await memberHelpers.stake(auditTokenMin, { from: validator2 });
            await memberHelpers.stake(auditTokenMin, { from: validator3 });
            await memberHelpers.stake(auditTokenMin, { from: enterprise1 });

            await nodeOperations.toggleNodeOperator({ from: validator1 });
            await nodeOperations.toggleNodeOperator({ from: validator2 });
            await nodeOperations.toggleNodeOperator({ from: validator3 });

            // await cohortFactory.inviteValidator(validator1, 1, { from: enterprise1 });
            // await cohortFactory.inviteValidator(validator2, 1, { from: enterprise1 });
            // await cohortFactory.inviteValidator(validator3, 1, { from: enterprise1 });

            await cohortFactory.inviteValidatorMultiple([validator1, validator2, validator3], 1, { from: enterprise1 });


            await cohortFactory.acceptInvitation(enterprise1, 0, { from: validator1 });
            await cohortFactory.acceptInvitation(enterprise1, 1, { from: validator2 });
            await cohortFactory.acceptInvitation(enterprise1, 2, { from: validator3 });

            await cohortFactory.createCohort(1, { from: enterprise1 });
            let validatorList = await cohortFactory.returnValidatorList(enterprise1, 1);

            const isInvited = await cohortFactory.isValidatorInvited(enterprise1, validator1, 1);

            let documentHash = web3.utils.soliditySha3("2+1=4");
            let result = await validation.initializeValidationCohort(documentHash, '', 1, { from: enterprise1 });


            let event = result.logs[0];
            let validationInitTime = event.args.initTime;

            // await validation.validate(documentHash, validationInitTime, enterprise1, 1, "", documentHash, { from: validator1, gas: 900000 });


            await validation.validate(documentHash, validationInitTime, enterprise1, 1, "", documentHash, { from: validator1, gas: 900000 });
            await validation.validate(documentHash, validationInitTime, enterprise1, 1, "", documentHash, { from: validator2, gas: 900000 });
            await validation.validate(documentHash, validationInitTime, enterprise1, 1, "", documentHash, { from: validator3, gas: 900000 });

        })

        it("Should succeed. Claim rewards by validator who has earned some funds. ", async () => {

            let balanceBefore = await memberHelpers.returnDepositAmount(validator1);
            let enterpriseMatch = await members.enterpriseMatch();
            let enterprisePortion = new BigNumber(tokenPerValidation.toString()).mult(enterpriseMatch.toString()).div(10000);
            let stakeAmount = (await nodeOperations.nodeOpStruct(validator1)).stakeAmount;

            let stakeRatio = await nodeOperations.stakeRatio();
            let stake = await  memberHelpers.returnDepositAmount(validator3);


            await nodeOperations.claimStakeRewards(false, {from:validator1});

            let balanceBeforeRedeem = await memberHelpers.returnDepositAmount(validator1);

            let result = await memberHelpers.redeem(new BigNumber(stakeAmount.toString()).add(auditTokenMin), { from: validator1 });

            let event = result.logs[0];
            let amount = event.args.amount;

            let balanceAfter = await memberHelpers.returnDepositAmount(validator1);
            assert.strictEqual(balanceAfter.toString(), new BigNumber(balanceBefore.toString()).add(stakeAmount.toString()).subtract(amount.toString()).toString());
        })

        it("Should fail. Claim rewards by validator who has no funds. ", async () => {

            try {
                await memberHelpers.redeem(auditTokenMin, { from: validator4 });
                expectRevert()

            } catch (error) {
                ensureException(error);
            }
        })

        it("Should succeed. Enterprise can withdraw funds minus obligation to cover payments since recent update. ", async () => {

            let documentHash = web3.utils.soliditySha3("2+1=4");
            await validation.initializeValidationCohort(documentHash, '', 1, { from: enterprise1 });


            let balanceBefore = await memberHelpers.returnDepositAmount(enterprise1);
            let outstandingValidations = await validation.outstandingValidations(enterprise1);
            let enterpriseMatch = await members.enterpriseMatch();

            let fundsForOutstandingValidations = new BigNumber(tokenPerValidation.toString()).mult(enterpriseMatch.toString()).mult(outstandingValidations.toString()).div(10000);

            let fundsAvailableForWithdrawal = new BigNumber(balanceBefore.toString()).subtract(fundsForOutstandingValidations.toString());
            await memberHelpers.redeem(fundsAvailableForWithdrawal, { from: enterprise1 });

            let balanceAfter = await memberHelpers.returnDepositAmount(enterprise1);
            assert.strictEqual(balanceAfter.toString(), fundsForOutstandingValidations.toString());

        })

        it("Should fail. Enterprise withdraws funds above obligation to cover payments since recent update. ", async () => {

            let balanceBefore = await memberHelpers.returnDepositAmount(enterprise1);
            let documentHash = web3.utils.soliditySha3("2+1=4");
            await validation.initializeValidationCohort(documentHash, '', 1, { from: enterprise1 });

            try {
                await memberHelpers.redeem(balanceBefore, { from: enterprise1 });
                expectRevert()
            } catch (error) {
                ensureException(error);
            }
        })
    })
})
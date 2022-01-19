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

const VALIDATION = artifacts.require('../ValidationsNoCohort');
const VALIDATION_HELPERS = artifacts.require('../ValidationHelpers');



import expectRevert from './helpers/expectRevert';
import { assert } from 'chai';
let BN = require("big-number");
const timeMachine = require('ganache-time-traveler');





contract("Node Operations contract", (accounts) => {

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
    let nodeOperations
    let depositModifiers;
    let validation;
    let validationHelpers;

    let documentHash;
    let validationHash;

    let auditTokenMin = "5000000000000000000000";
    let rewardTokensHalf = "341500000000000000000";
    let rewardTokens = "1000000000000000000";

    let cohortAddress;
    let cohortContract;
    let result;

    let CONTROLLER_ROLE = web3.utils.keccak256("CONTROLLER_ROLE");
    let SETTER_ROLE = web3.utils.keccak256("SETTER_ROLE");



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

        validation = await VALIDATION.new(members.address, memberHelpers.address, cohortFactory.address, depositModifiers.address, nodeOperations.address, validationHelpers.address)



        let CONTROLLER_ROLE = web3.utils.keccak256("CONTROLLER_ROLE");
        await members.grantRole(CONTROLLER_ROLE, admin, { from: admin });

        await nodeOperations.grantRole(CONTROLLER_ROLE, validation.address, { from: admin });
        await nodeOperations.grantRole(CONTROLLER_ROLE, depositModifiers.address, { from: admin });

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
        // await members.addUser(validator3, "Validators 3", 1, { from: admin });
        // await members.addUser(validator4, "Validators 4", 1, { from: admin });


        await members.addUser(dataSubscriber, "DataSubscriberr 1", 2, { from: admin });


        await token.transfer(validator1, tokenAmount1);
        await token.transfer(validator2, tokenAmount2);
        // await token.transfer(validator3, tokenAmount3);
        // await token.transfer(validator4, tokenAmount4);
        await token.transfer(dataSubscriber, tokenAmount5);

        await token.approve(memberHelpers.address, auditTokenMin, { from: validator1 });
        await token.approve(memberHelpers.address, auditTokenMin, { from: validator2 });
        // await token.approve(memberHelpers.address, auditTokenMin, { from: validator3 });
        // await token.approve(memberHelpers.address, auditTokenMin, { from: validator4 });
        await token.approve(memberHelpers.address, auditTokenMin, { from: dataSubscriber });



        await memberHelpers.stake(auditTokenMin, { from: validator1 });
        await memberHelpers.stake(auditTokenMin, { from: validator2 });
        // await memberHelpers.stake(auditTokenMin, { from: validator3 });
        // await memberHelpers.stake(auditTokenMin, { from: validator4 });
        await memberHelpers.stake(auditTokenMin, { from: dataSubscriber });


        documentHash = web3.utils.soliditySha3(documentURL);
        await memberHelpers.grantRole(CONTROLLER_ROLE, validation.address, { from: admin });
        await nodeOperations.grantRole(SETTER_ROLE, admin, { from: admin });

    })


    describe("Deploy", async () => {

        it("Should succeed. nodeOperations deployed and initialized", async () => {

            let tokenAddress = await nodeOperations.auditToken();
            let memberHelperAddress = await validation.memberHelpers();
            assert.strictEqual(tokenAddress, token.address);
            assert.strictEqual(memberHelperAddress, memberHelpers.address);

        })
    })

    describe("Test governance updates", async () => {

        it("It should succeed. Stake Ratio Delegating was updated by authorized user.", async () => {

            const newValue = "2000";

            await nodeOperations.updateStakeRatioDelegating(newValue, { from: admin });
            let newValueInContract = await nodeOperations.stakeRatioDelegating();
            assert.strictEqual(newValueInContract.toString(), newValue);
        })

        it("It should fail. Stake Ratio Delegating was updated by unauthorized user.", async () => {
            const newValue = "2000";

            try {
                await nodeOperations.updateStakeRatioDelegating(newValue, { from: enterprise1 })
                expectRevert();
            }
            catch (error) {
                ensureException(error);
            }
        })

        it("It should succeed. Stake Ratio Referral was updated by authorized user.", async () => {

            const newValue = "2000";

            await nodeOperations.updateStakingRatioReferral(newValue, { from: admin });
            let newValueInContract = await nodeOperations.stakingRatioReferral();
            assert.strictEqual(newValueInContract.toString(), newValue);
        })

        it("It should fail. Stake Ratio Referral was updated by unauthorized user.", async () => {
            const newValue = "2000";

            try {
                await nodeOperations.updateStakingRatioReferral(newValue, { from: enterprise1 })
                expectRevert();
            }
            catch (error) {
                ensureException(error);
            }
        })

        it("It should succeed. Stake Ratio was updated by authorized user.", async () => {

            const newValue = "2000";

            await nodeOperations.updateStakeRatio(newValue, { from: admin });
            let newValueInContract = await nodeOperations.stakeRatio();
            assert.strictEqual(newValueInContract.toString(), newValue);
        })

        it("It should fail. Stake Ratio was updated by unauthorized user.", async () => {
            const newValue = "2000";

            try {
                await nodeOperations.updateStakeRatio(newValue, { from: enterprise1 })
                expectRevert();
            }
            catch (error) {
                ensureException(error);
            }
        })

        it("It should succeed. POWFee was updated by authorized user.", async () => {

            const newValue = "2000";

            await nodeOperations.updatePOWFee(newValue, { from: admin });
            let newValueInContract = await nodeOperations.POWFee();
            assert.strictEqual(newValueInContract.toString(), newValue);
        })

        it("It should fail. POWFee was updated by unauthorized user.", async () => {
            const newValue = "2000";

            try {
                await nodeOperations.updatePOWFee(newValue, { from: enterprise1 })
                expectRevert();
            }
            catch (error) {
                ensureException(error);
            }
        })

    })


    describe("Toggle Node Operator", async () => {

        it("It should succeed. toggleNodeOperator has been called by user who is a validator", async () => {

            let isOperatorBefore = await nodeOperations.isNodeOperator(validator1);
            let result = await nodeOperations.toggleNodeOperator({ from: validator1 });
            let event = result.logs[0];
            assert.equal(event.event, 'LogNodeOperatorToggled');
            let user = event.args.user;


            let isOperatorAfter = await nodeOperations.isNodeOperator(validator1);
            assert.strictEqual(isOperatorBefore, !isOperatorAfter);
            assert.strictEqual(user, validator1);

        })

        it("It should fail. toggleNodeOperator has been called by user who is not a validator", async () => {

            try {
                await nodeOperations.toggleNodeOperator({ from: enterprise1 });
                expectRevert();
            }
            catch (error) {
                ensureException(error);
            }

        })
    })

    describe("Toggle CPA", async () => {

        it("It should succeed. toggleCPA has been called by user who is a validator", async () => {

            let isCPABefore = (await nodeOperations.nodeOpStruct(validator1)).isCPA;
            let result = await nodeOperations.toggleCPA({ from: validator1 });
            let event = result.logs[0];
            assert.equal(event.event, 'LogCPAToggled');
            let user = event.args.user;
            let isCPAfter = (await nodeOperations.nodeOpStruct(validator1)).isCPA;

            assert.strictEqual(isCPABefore, !isCPAfter);
            assert.strictEqual(user, validator1);

        })

        it("It should fail. toggleCPA has been called by user who is not a validator", async () => {

            try {
                await nodeOperations.toggleCPA({ from: enterprise1 });
                expectRevert();
            }
            catch (error) {
                ensureException(error);
            }

        })
    })


    describe("toggle NoDelegate", async () => {

        it("It should succeed. toggleNoDelegate has been called by user who is a validator", async () => {

            let isNoDelegateBefore = (await nodeOperations.nodeOpStruct(validator1)).noDelegations;
            let result = await nodeOperations.toggleNoDelegate({ from: validator1 });
            let event = result.logs[0];
            assert.equal(event.event, 'LogNoDelegateToggled');
            let user = event.args.user;
            let isNoDelegateAfter = (await nodeOperations.nodeOpStruct(validator1)).noDelegations;

            assert.strictEqual(isNoDelegateBefore, !isNoDelegateAfter);
            assert.strictEqual(user, validator1);

        })

        it("It should fail. toggleNoDelegate has been called by user who is not a validator", async () => {

            try {
                await nodeOperations.toggleNoDelegate({ from: enterprise1 });
                expectRevert();
            }
            catch (error) {
                ensureException(error);
            }

        })
    })

    describe("Delegate stake", async () => {

        it("It should succeed. Validator can delegate their stake to another node", async () => {


            await nodeOperations.toggleNodeOperator({ from: validator1 });
            let result = await nodeOperations.delegate(validator1, { from: validator2 });

            let event = result.logs[0];
            assert.equal(event.event, 'LogDelegation');
            let newDelegatee = event.args.newDelegatee;

            assert.strictEqual(validator1, newDelegatee);

        })

        it("It should fail. Validator can't delegate their stake to another node, while they run their own node.", async () => {

            await nodeOperations.toggleNodeOperator({ from: validator1 });
            await nodeOperations.toggleNodeOperator({ from: validator2 });

            try {
                await nodeOperations.delegate(validator1, { from: validator2 });
                expectRevert();
            }
            catch (error) {
                ensureException(error);

            }

        })

        it("It should fail. Validator can't delegate their stake to the same member for the second time.", async () => {

            await nodeOperations.toggleNodeOperator({ from: validator1 });
            await nodeOperations.delegate(validator1, { from: validator2 });


            try {
                await nodeOperations.delegate(validator1, { from: validator2 });
                expectRevert();
            }
            catch (error) {
                ensureException(error);
            }

        })

        it("It should fail. Non-validator can't delegate their stake", async () => {

            await nodeOperations.toggleNodeOperator({ from: validator1 });
            try {
                await nodeOperations.delegate(validator1, { from: enterprise1 });
                expectRevert();
            }
            catch (error) {
                ensureException(error);
            }

        })


    })

    describe("Cancel delegation", async () => {

        it("It should succeed. Validator can cancel delegation.", async () => {

            await nodeOperations.toggleNodeOperator({ from: validator1 });
            let result = await nodeOperations.delegate(validator1, { from: validator2 });

            let event = result.logs[0];
            assert.equal(event.event, 'LogDelegation');
            let newDelegatee = event.args.newDelegatee;
            assert.strictEqual(validator1, newDelegatee);

            await nodeOperations.removeDelegation({ from: validator2 });
            let validator = await nodeOperations.nodeOpStruct(validator2);

            assert.strictEqual(validator.delegatorLink, "0x0000000000000000000000000000000000000000");

        })

        it("It should fail. Validator can't cancel their delegation before they delegate their stake", async () => {


            try {
                await nodeOperations.removeDelegation({ from: validator2 });
                expectRevert();
            }
            catch (error) {
                ensureException(error);
            }

        })

        it("It should fail. Non validator can't perform this action.", async () => {


            try {
                await nodeOperations.removeDelegation({ from: enterprise1 });
                expectRevert();
            }
            catch (error) {
                ensureException(error);
            }

        })

    })


    describe("Record Stake Rewards", async () => {

        let validationInitTime;

        beforeEach(async () => {

            let documentHash = web3.utils.soliditySha3(documentURL);
            let result = await validation.initializeValidationNoCohort(documentHash, documentURL, 1, { from: dataSubscriber });

            let event = result.logs[0];
            validationInitTime = event.args.initTime;

            await nodeOperations.toggleNodeOperator({ from: validator1 });
            await nodeOperations.toggleNodeOperator({ from: validator2 });



        })

        it("It should succeed. Validator received stake rewards from their direct validation.", async () => {

            await validation.validate(documentHash, validationInitTime, dataSubscriber, 1, documentURL, documentHash, { from: validator1, gas: 900000 });


            // ensure that user is not the winner for the proof of stake reward
            timeMachine.advanceTimeAndBlock(1);

            await validation.validate(documentHash, validationInitTime, dataSubscriber, 1, documentURL, documentHash, { from: validator2, gas: 900000 });


            let stakeRatio = await nodeOperations.stakeRatio();
            let deposit = await memberHelpers.returnDepositAmount(validator2);

            let oneValidationDirect = BN(deposit.toString()).divide(BN(stakeRatio.toString()));

            let result = await nodeOperations.claimStakeRewards(false, { from: validator2 });

            let event = result.logs[0];
            assert.equal(event.event, 'LogStakingRewardsClaimed');
            let amount = event.args.amount;

            assert.strictEqual(oneValidationDirect.toString(), amount.toString());

        })

        it("It should succeed. Validator received correct stake rewards from their delegation", async () => {



            let deposit = await memberHelpers.returnDepositAmount(validator2);
            let delegatingRatio = await nodeOperations.stakeRatioDelegating();
            let oneValidationDelegating = BN(deposit.toString()).divide(BN(delegatingRatio.toString()));

            await nodeOperations.toggleNodeOperator({ from: validator2 });
            await nodeOperations.delegate(validator1, { from: validator2 });
            await validation.validate(documentHash, validationInitTime, dataSubscriber, 1, documentURL, documentHash, { from: validator1, gas: 900000 });


            let nodeOperatorStruct = await nodeOperations.nodeOpStruct(validator2);
            let amount = nodeOperatorStruct.delegateAmount;

            assert.strictEqual(amount.toString(), oneValidationDelegating.toString());

        })


        it("It should succeed. Validator received correct stake rewards from their node operation POW", async () => {

            let POWFee = await nodeOperations.POWFee();

            // await validation.validate(documentHash, validationInitTime, 1, "", { from: validator1, gas: 800000 });
            let result = await validation.validate(documentHash, validationInitTime, dataSubscriber, 1, documentURL, documentHash, { from: validator1, gas: 900000 });


            timeMachine.advanceTimeAndBlock(1);

            await validation.validate(documentHash, validationInitTime, dataSubscriber, 1, documentURL, documentHash, { from: validator2, gas: 900000 });


            let event = result.logs[1];
            assert.equal(event.event, 'RequestExecuted');

            validation.voteWinner(event.args.winners, [true, true, true], event.args.validationHash, { from: validator1 });
            validation.voteWinner(event.args.winners, [true, true, true], event.args.validationHash, { from: validator2 });

            let nodeOperatorStruct = await nodeOperations.nodeOpStruct(validator1);
            let amount = nodeOperatorStruct.POWAmount;
            assert.strictEqual(amount.toString(), POWFee.toString());

        })

        it("It should succeed. Validator received correct stake rewards from their referral", async () => {

            let deposit = await memberHelpers.returnDepositAmount(validator1);
            let referralRatio = await nodeOperations.stakingRatioReferral();
            let oneValidationReferral = BN(deposit.toString()).divide(BN(referralRatio.toString()));

            await nodeOperations.toggleNodeOperator({ from: validator2 });
            await nodeOperations.delegate(validator1, { from: validator2 });
            await validation.validate(documentHash, validationInitTime, dataSubscriber, 1, documentURL, documentHash, { from: validator1, gas: 900000 });

            let nodeOperatorStruct = await nodeOperations.nodeOpStruct(validator1);
            let amount = nodeOperatorStruct.referralAmount;

            assert.strictEqual(amount.toString(), oneValidationReferral.toString());

        })
    })


    describe("Claim Stake Rewards", async () => {

        let validationInitTime;

        beforeEach(async () => {

            let documentHash = web3.utils.soliditySha3(documentURL);
            let result = await validation.initializeValidationNoCohort(documentHash, documentURL, 1, { from: dataSubscriber });

            let event = result.logs[0];
            validationInitTime = event.args.initTime;

            await nodeOperations.toggleNodeOperator({ from: validator1 });
            await nodeOperations.toggleNodeOperator({ from: validator2 });

        })

        it("It should succeed. Node Operator claimed correct stake rewards from their node operation, POW and referral", async () => {

            let POWFee = await nodeOperations.POWFee();
            let deposit = await memberHelpers.returnDepositAmount(validator1);
            let referralRatio = await nodeOperations.stakingRatioReferral();
            let stakeRatio = await nodeOperations.stakeRatio();

            let oneValidationReferral = BN(deposit.toString()).divide(BN(referralRatio.toString()));
            let oneValidationDirect = BN(deposit.toString()).divide(BN(stakeRatio.toString()));

            let totalEarnedCalc = BN(oneValidationReferral).add(oneValidationDirect).add(POWFee.toString());

            await nodeOperations.toggleNodeOperator({ from: validator2 });
            await nodeOperations.delegate(validator1, { from: validator2 });
            let result = await validation.validate(documentHash, validationInitTime, dataSubscriber, 1, documentURL, documentHash, { from: validator1, gas: 900000 });

            let event = result.logs[1];
            assert.equal(event.event, 'RequestExecuted');

            validation.voteWinner(event.args.winners, [true, true, true], event.args.validationHash, { from: validator1 });

            let result2 = await nodeOperations.claimStakeRewards(false, { from: validator1 });

            let event2 = result2.logs[0];
            assert.equal(event2.event, 'LogStakingRewardsClaimed');
            let amount = event2.args.amount;

            let depositAfter = await memberHelpers.returnDepositAmount(validator1);
            let depositAfterDifference = BN(depositAfter.toString()).minus(BN(deposit.toString()));
            assert.strictEqual(depositAfterDifference.toString(), totalEarnedCalc.toString());
            assert.strictEqual(depositAfterDifference.toString(), amount.toString());

        })




        it("It should succeed. Delegating validator claimed correct stake rewards from their delegation", async () => {

            let deposit = await memberHelpers.returnDepositAmount(validator2);
            let delegatingRatio = await nodeOperations.stakeRatioDelegating();

            let oneValidationDelegating = BN(deposit.toString()).divide(BN(delegatingRatio.toString()));

            await nodeOperations.toggleNodeOperator({ from: validator2 });
            await nodeOperations.delegate(validator1, { from: validator2 });
            await validation.validate(documentHash, validationInitTime, dataSubscriber, 1, documentURL, documentHash, { from: validator1, gas: 900000 });

            let result = await nodeOperations.claimStakeRewards(false, { from: validator2 });

            let event = result.logs[0];
            assert.equal(event.event, 'LogStakingRewardsClaimed');
            let amount = event.args.amount;

            let depositAfter = await memberHelpers.returnDepositAmount(validator2);
            let depositAfterDifference = BN(depositAfter.toString()).minus(BN(deposit.toString()));
            assert.strictEqual(depositAfterDifference.toString(), oneValidationDelegating.toString());
            assert.strictEqual(depositAfterDifference.toString(), amount.toString());

        })


        it("It should succeed. Delegating validator claimed correct stake rewards from their delegation into their wallet", async () => {

            let deposit = await memberHelpers.returnDepositAmount(validator2);
            let delegatingRatio = await nodeOperations.stakeRatioDelegating();
            let walletValue = await token.balanceOf(validator2);

            let oneValidationDelegating = BN(deposit.toString()).divide(BN(delegatingRatio.toString()));


            await nodeOperations.toggleNodeOperator({ from: validator2 });
            await nodeOperations.delegate(validator1, { from: validator2 });
            await validation.validate(documentHash, validationInitTime, dataSubscriber, 1, documentURL, documentHash, { from: validator1, gas: 900000 });


            let result = await nodeOperations.claimStakeRewards(true, { from: validator2 });

            let event = result.logs[0];
            assert.equal(event.event, 'LogStakingRewardsTransferredOut');
            let amount = event.args.amount;

            let walletValueAfter = await token.balanceOf(validator2);

            let walletAfterDifference = BN(walletValueAfter.toString()).minus(BN(walletValue.toString()));
            assert.strictEqual(walletAfterDifference.toString(), oneValidationDelegating.toString());
            assert.strictEqual(walletAfterDifference.toString(), amount.toString());

        })
    })
})
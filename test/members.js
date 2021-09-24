import { assert } from 'chai';
import { en } from 'ethers/wordlists';
import {
    ensureException,
    duration
} from './helpers/utils.js';

const MEMBERS = artifacts.require('../Members');
const TOKEN = artifacts.require('../AuditToken');

var BigNumber = require('big-number');
let SETTER_ROLE = web3.utils.keccak256("SETTER_ROLE");



contract("Member contract", (accounts) => {

    const admin = accounts[0];
    const enterprise1 = accounts[1];
    const validator1 = accounts[2];
    const validator2 = accounts[3];
    const validator3 = accounts[4];
    const dataSubscriber = accounts[5];
    const platformAccount = accounts[6];
    const validator4 = accounts[7];


    let members;
    let token;
    let CONTROLLER_ROLE;

    let auditTokenMin = "5000000000000000000000";
    let auditTokenLesMin = "1";
    let auditTokenMorMax = "25100000000000000000000";
    let auditTokenMax = "25000000000000000000000";

    let rewardTokens = "1000000000000000000";

    beforeEach(async () => {

        token = await TOKEN.new(admin);
        members = await MEMBERS.new(platformAccount);
        CONTROLLER_ROLE = web3.utils.keccak256("CONTROLLER_ROLE");
        await members.grantRole(CONTROLLER_ROLE, admin, { from: admin });
    })


    describe("Deploy", async () => {

        it("Should succeed. Initialize members with Audit token", async () => {

            let platformAddress = await members.platformAddress();
            assert.strictEqual(platformAddress, platformAccount);
        })
    })

    describe("Enter Enterprise User", async () => {

        it("Should fail.Add enterprise user from unauthorized account", async () => {

            try {
                await members.addUser(enterprise1, "Enterprise 1", 0, { from: enterprise1 });
            } catch (error) {
                ensureException(error);
            }

        })

        it("Should succeed. Add enterprise user from authorized account", async () => {
            const result = await members.addUser(enterprise1, "Enterprise 1", 0, { from: admin });

            assert.lengthOf(result.logs, 1);

            let event = result.logs[0];
            assert.equal(event.event, 'UserAdded');
            assert.strictEqual(event.args.user, enterprise1);
            assert.strictEqual(event.args.name, "Enterprise 1");
        })


    })


    describe("Enter Validator User", async () => {

        it("Should fail. Add validator user from unauthorized account", async () => {

            try {
                await members.addUser(validator1, "Validator 1", 1, { from: enterprise1 });
            } catch (error) {
                ensureException(error);
            }

        })

        it("Should succeed. Add validator user from authorized account", async () => {
            const result = await members.addUser(validator1, "Validator 1", 1, { from: admin });

            assert.lengthOf(result.logs, 1);

            let event = result.logs[0];
            assert.equal(event.event, 'UserAdded');
            assert.strictEqual(event.args.user, validator1);
            assert.strictEqual(event.args.name, "Validator 1");
        })


    })

    // describe("Stake by validators", async () => {

    //     beforeEach(async () => {

    //         await members.addValidatorUser(validator1, "Validators 1", { from: admin });
    //         await token.transfer(validator1, auditTokenMin, { from: admin });
    //         await token.approve(members.address, auditTokenMin, { from: validator1 });
    //     })

    //     it("Should succeed. Validator stakes tokens.", async () => {

    //         let result = await members.stake(auditTokenMin, { from: validator1 });
    //         assert.lengthOf(result.logs, 1);

    //         let event = result.logs[0];
    //         assert.equal(event.event, 'LogDepositReceived');
    //         assert.strictEqual(event.args.from, validator1);
    //         assert.strictEqual(event.args.amount.toString(), auditTokenMin);
    //     })

    //     it("Should fail. User hasn't been registered as validator.", async () => {
    //         try {
    //             let result = await members.stake(auditTokenMin, { from: validator2 });
    //         } catch (error) {
    //             ensureException(error);
    //         }
    //     })

    //     it("Should fail. User contributed less than required amount.", async () => {

    //         try {
    //             let result = await members.stake(auditTokenLesMin, { from: validator1 });
    //         } catch (error) {
    //             ensureException(error);
    //         }

    //     })

    //     it("Should fail. User contributed more than required amount.", async () => {

    //         await members.addValidatorUser(validator2, "Validators 2", { from: admin });
    //         await token.transfer(validator2, auditTokenMorMax, { from: admin });
    //         await token.approve(members.address, auditTokenMorMax, { from: validator2 });

    //         try {
    //             let result = await members.stake(auditTokenMorMax, { from: validator2 });
    //         } catch (error) {
    //             ensureException(error);
    //         }

    //     })

    // })

    // describe("Deposit by Enterprise", async () => {

    //     beforeEach(async () => {

    //         await members.addEnterpriseUser(enterprise1, "Enterprise 1", { from: admin });
    //         await token.transfer(enterprise1, auditTokenMin, { from: admin });
    //         await token.approve(members.address, auditTokenMin, { from: enterprise1 });
    //     })

    //     it("Should succeed. Enterprise deposits tokens.", async () => {

    //         let result = await members.stake(auditTokenMin, { from: enterprise1 });
    //         assert.lengthOf(result.logs, 1);

    //         let event = result.logs[0];
    //         assert.equal(event.event, 'LogDepositReceived');
    //         assert.strictEqual(event.args.from, enterprise1);
    //         assert.strictEqual(event.args.amount.toString(), auditTokenMin);
    //     })

    //     it("Should fail. User hasn't been registered as enterprise.", async () => {
    //         try {
    //             let result = await members.stake(auditTokenMin, { from: admin });
    //         } catch (error) {
    //             ensureException(error);
    //         }
    //     })
    // })

    // describe("Data subscriber subscribes to cohorts", async () => {

    //     let cohortAddress;

    //     beforeEach(async () => {

    //         await members.addEnterpriseUser(enterprise1, "Enterprise 1", { from: admin });
    //         await members.addValidatorUser(validator1, "Validators 1", { from: admin });
    //         await members.addValidatorUser(validator2, "Validators 2", { from: admin });
    //         await members.addValidatorUser(validator3, "Validators 3", { from: admin });

    //         await token.transfer(validator1, auditTokenMax, { from: admin });
    //         await token.transfer(validator2, auditTokenMin, { from: admin });
    //         await token.transfer(validator3, auditTokenMin, { from: admin });

    //         await token.approve(members.address, auditTokenMax, { from: validator1 });
    //         await token.approve(members.address, auditTokenMin, { from: validator2 });
    //         await token.approve(members.address, auditTokenMin, { from: validator3 });

    //         await members.stake(auditTokenMax, { from: validator1 });
    //         await members.stake(auditTokenMin, { from: validator2 });
    //         await members.stake(auditTokenMin, { from: validator3 });


    //         await cohortFactory.inviteValidator(validator1, 0, { from: enterprise1 });
    //         await cohortFactory.inviteValidator(validator2, 0, { from: enterprise1 });
    //         await cohortFactory.inviteValidator(validator3, 0, { from: enterprise1 });

    //         await cohortFactory.acceptInvitation(enterprise1, 0, { from: validator1 });
    //         await cohortFactory.acceptInvitation(enterprise1, 1, { from: validator2 });
    //         await cohortFactory.acceptInvitation(enterprise1, 2, { from: validator3 });

            

    //         let result = await cohortFactory.createCohort(0, { from: enterprise1 });
    //         assert.lengthOf(result.logs, 2);

    //         let event = result.logs[1];
    //         assert.equal(event.event, 'CohortCreated');
    //         cohortAddress = event.args.cohort;

    //     })

    //     it("Should succeed. Data subscriber subscribed to view data feeds.", async () => {



    //         let accessFee = await members.accessFee();
    //         await token.transfer(dataSubscriber, auditTokenMin, { from: admin });
    //         await token.approve(members.address, accessFee, { from: dataSubscriber });

    //         const balanceBefore = await token.balanceOf(platformAccount);
    //         let result = await members.dataSubscriberPayment(cohortAddress, 0, { from: dataSubscriber });
    //         assert.lengthOf(result.logs, 4);

    //         let event = result.logs[3];
    //         assert.equal(event.event, 'LogDataSubscriberPaid');
    //         cohortAddress = event.args.cohort;
    //         let enterpriseBalance = await members.deposits(enterprise1);
    //         let validator1Balance = await members.deposits(validator1);
    //         let validator2Balance = await members.deposits(validator2);
    //         let validator3Balance = await members.deposits(validator3);

    //         let totalValidatorAmt = (validator1Balance - auditTokenMax) + (validator2Balance - auditTokenMin) + (validator3Balance - auditTokenMin);

    //         const platformBalance = await token.balanceOf(platformAccount);
    //         assert.strictEqual(enterpriseBalance.toString(), (accessFee * 40 / 100).toString());
    //         assert.strictEqual(totalValidatorAmt.toString(), (accessFee * 40 / 100).toString());
    //         assert.strictEqual(platformBalance.toString(), (accessFee * 20 / 100).toString());

    //     })

    //     it("Should fail. Data subscriber didn't authorize members contract to withdraw funds.", async () => {

    //         await token.transfer(dataSubscriber, auditTokenMin, { from: admin });

    //         try {
    //             await members.dataSubscriberPayment(cohortAddress, 0, { from: dataSubscriber });
    //         } catch (error) {
    //             ensureException(error);
    //         }


    //     })

    //     it("Should fail. Data subscriber doesn't have sufficient funds.", async () => {

    //         await token.approve(members.address, auditTokenMin, { from: dataSubscriber });

    //         try {
    //             await members.dataSubscriberPayment(cohortAddress, 0, { from: dataSubscriber });
    //         } catch (error) {
    //             ensureException(error);
    //         }


    //     })
    // })


    

    describe("Test governance updates", async () => {

        it("It should succeed. Reward per validation was updated by authorized user.", async () => {

            await members.grantRole(SETTER_ROLE, admin, { from: admin });
            await members.updateTokensPerValidation(auditTokenMin, { from: admin });
            let newReward = await members.amountTokensPerValidation();
            assert.strictEqual(newReward.toString(), auditTokenMin.toString());
        })


        it("It should fail. Reward per validation was updated by unauthorized user.", async () => {

            try {
                await members.updateTokensPerValidation(auditTokenMin, { from: enterprise1 });
            }
            catch (error) {
                ensureException(error);
            }
        })

        it("It should succeed. updateEnterpriseMatch was updated by authorized user.", async () => {

            await members.grantRole(SETTER_ROLE, admin, { from: admin });
            await members.updateEnterpriseMatch(2340, { from: admin });
            let newMatchValue = await members.enterpriseMatch();
            assert.strictEqual(newMatchValue.toString(), "2340");
        })


        it("It should fail. updateEnterpriseMatch was updated by unauthorized user.", async () => {

            try {
                await members.updateEnterpriseMatch(2340, { from: enterprise1 });
            }
            catch (error) {
                ensureException(error);
            }
        })

        it("It should succeed. Quorum amount was updated by authorized user.", async () => {


            await members.grantRole(SETTER_ROLE, admin, { from: admin });
            await members.updateQuorum("20", { from: admin });
            let newQuorum = await members.requiredQuorum();
            assert.strictEqual(newQuorum.toString(), "20");
        })


        it("It should fail. Quorum amount was updated by unauthorized user.", async () => {

            try {
                await members.updateQuorum("20", { from: admin });
                expectRevert();
            }
            catch (error) {
                ensureException(error);
            }
        })



    })


})
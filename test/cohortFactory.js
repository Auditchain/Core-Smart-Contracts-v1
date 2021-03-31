import {
    ensureException,
    duration
} from './helpers/utils.js';

const MEMBERS = artifacts.require('../Members');
const TOKEN = artifacts.require('../AuditToken');
const COHORTFACTORY = artifacts.require('../CohortFactory');
const Cohort = require('../build/contracts/Cohort.json');
const CREATECOHORT = artifacts.require('../CreateCohort');



contract("cohortFactory contract", (accounts) => {

    const owner = accounts[0];
    const enterprise1 = accounts[1];
    const validator1 = accounts[2];
    const validator2 = accounts[3];
    const validator3 = accounts[4];
    const validator4 = accounts[5];
    const platformAccount = accounts[6];
    const addressZero = "0x0000000000000000000000000000000000000000";

    let members;
    let token;
    let cohortFactory;
    let createCohort;
    let auditTokenMin = "5000000000000000000000";
    let auditTokenLesMin = "1";
    let auditTokenMorMax = "25100000000000000000000";
    let CONTROLLER_ROLE = web3.utils.keccak256("CONTROLLER_ROLE");
    let SETTER_ROLE = web3.utils.keccak256("SETTER_ROLE");

    beforeEach(async () => {

        token = await TOKEN.new(owner);

        members = await MEMBERS.new(token.address, platformAccount);
        createCohort = await CREATECOHORT.new(members.address, token.address)
        cohortFactory = await COHORTFACTORY.new(members.address, createCohort.address);



        await members.grantRole(CONTROLLER_ROLE, owner, { from: owner });
        await members.setCohortFactory(cohortFactory.address, { from: owner });
    })


    describe("Deploy", async () => {

        it("Should succeed. Initialize cohortFactory with Audit token", async () => {

            let tokenAddress = await members.auditToken();
            assert.strictEqual(tokenAddress, token.address);
        })
    })


    describe("Invite Validator", async () => {

        beforeEach(async () => {

            await members.addUser(enterprise1, "Enterprise 1", 0, { from: owner });
            await members.addUser(validator1, "Validators 1", 1, { from: owner });
            await token.transfer(validator1, auditTokenMin, { from: owner });
            await token.approve(members.address, auditTokenMin, { from: validator1 });
            await members.stake(auditTokenMin, { from: validator1 });
        })

        it("Should succeed. Invite validator from enterprise account", async () => {



            const result = await cohortFactory.inviteValidator(validator1, 0, addressZero, { from: enterprise1 });

            assert.lengthOf(result.logs, 1);

            let event = result.logs[0];
            assert.equal(event.event, 'ValidatorInvited');
            assert.strictEqual(event.args.inviting, enterprise1);
            assert.strictEqual(event.args.invitee, validator1);

            assert.strictEqual(event.args.audits.toString(), "0");

        })


        it("Should fail. Invite validator from enterprise account for the second time.", async () => {



            try {
                await cohortFactory.inviteValidator(validator1, 0, addressZero, { from: enterprise1 });
            } catch (error) {
                ensureException(error);
            }

        })



        it("Should fail. Invite validator from an account which is not enterprise account.", async () => {

            try {
                await cohortFactory.inviteValidator(validator1, 0, addressZero, { from: validator1 });
            } catch (error) {
                ensureException(error);
            }

        })

        it("Should fail. Invite random account from enterprise account.", async () => {


            try {
                await cohortFactory.inviteValidator(validator4, 0, addressZero, { from: enterprise1 });
            } catch (error) {
                ensureException(error);
            }

        })

        it("Should fail. Invite random account from random account.", async () => {

            // await cohortFactory.addEnterpriseUser(enterprise1, "Enterprise 1", { from: owner });

            try {
                await cohortFactory.inviteValidator(validator4, 0, addressZero, { from: validator3 });
            } catch (error) {
                ensureException(error);
            }

        })



    })

    describe("Accept invitation by validator", async () => {

        beforeEach(async () => {

            await members.addUser(enterprise1, "Enterprise 1", 0, { from: owner });
            await members.addUser(validator1, "Validators 1", 1, { from: owner });
            await token.transfer(validator1, auditTokenMin, { from: owner });
            await token.approve(members.address, auditTokenMin, { from: validator1 });
            await members.stake(auditTokenMin, { from: validator1 });
            await cohortFactory.inviteValidator(validator1, 0, addressZero, { from: enterprise1 });
        })




        it("Should succeed. Invitation accepted by correct validator", async () => {


            let result = await cohortFactory.acceptInvitation(enterprise1, 0, { from: validator1 });

            assert.lengthOf(result.logs, 1);

            let event = result.logs[0];
            assert.equal(event.event, 'InvitationAccepted');
            assert.strictEqual(event.args.validator, validator1);
            assert.strictEqual(event.args.invitationNumber.toString(), "0");
        })

        it("Should fail. Invitation accepted by incorrect validator.", async () => {



            try {
                let result = await cohortFactory.acceptInvitation(enterprise1, 0, { from: validator2 });
            } catch (error) {
                ensureException(error);
            }


        })

        it("Should fail. Invitation accepted by random account.", async () => {



            try {
                let result = await cohortFactory.acceptInvitation(enterprise1, 0, { from: validator2 });
            } catch (error) {
                ensureException(error);
            }


        })


        it("Should fail. Non existing invitation accepted.", async () => {



            try {
                let result = await cohortFactory.acceptInvitation(enterprise1, 100, { from: validator1 });
            } catch (error) {
                ensureException(error);
            }


        })


    })

    describe("Create Cohort", async () => {

        beforeEach(async () => {

            await members.addUser(enterprise1, "Enterprise 1", 0, { from: owner });
            await members.addUser(validator1, "Validators 1", 1, { from: owner });
            await members.addUser(validator2, "Validators 2", 1, { from: owner });
            await members.addUser(validator3, "Validators 3", 1, { from: owner });

            await token.transfer(validator1, auditTokenMin, { from: owner });
            await token.transfer(validator2, auditTokenMin, { from: owner });
            await token.transfer(validator3, auditTokenMin, { from: owner });

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

        })

        it("Should succeed. Cohort created by enterprise", async () => {


            await createCohort.grantRole(CONTROLLER_ROLE, cohortFactory.address, { from: owner });

            let result = await cohortFactory.createCohort(0, { from: enterprise1 });
            assert.lengthOf(result.logs, 2);

            let event = result.logs[1];
            assert.equal(event.event, 'CohortCreated');
            let cohortAddress = event.args.cohort;

            var cohortContract = new web3.eth.Contract(Cohort["abi"], cohortAddress);
            let enterpriseInCohort = await cohortContract.methods.enterprise().call();
            assert.strictEqual(enterpriseInCohort, enterprise1);
        })


        it("Should fail. Less than 3 validators have accepted the invitations.", async () => {



            try {

                let result = await cohortFactory.createCohort(0, { from: enterprise1 });
            } catch (error) {
                ensureException(error);
            }

        })
    })

    describe("Add/Remove validator to/from existing cohort", async () => {

        beforeEach(async () => {

            await members.addUser(enterprise1, "Enterprise 1", 0, { from: owner });
            await members.addUser(validator1, "Validators 1", 1, { from: owner });
            await members.addUser(validator2, "Validators 2", 1, { from: owner });
            await members.addUser(validator3, "Validators 3", 1, { from: owner });
            await members.addUser(validator4, "Validators 4", 1, { from: owner });


            await token.transfer(validator1, auditTokenMin, { from: owner });
            await token.transfer(validator2, auditTokenMin, { from: owner });
            await token.transfer(validator3, auditTokenMin, { from: owner });
            await token.transfer(validator4, auditTokenMin, { from: owner });


            await token.approve(members.address, auditTokenMin, { from: validator1 });
            await token.approve(members.address, auditTokenMin, { from: validator2 });
            await token.approve(members.address, auditTokenMin, { from: validator3 });
            await token.approve(members.address, auditTokenMin, { from: validator4 });


            await members.stake(auditTokenMin, { from: validator1 });
            await members.stake(auditTokenMin, { from: validator2 });
            await members.stake(auditTokenMin, { from: validator3 });
            await members.stake(auditTokenMin, { from: validator4 });



            await cohortFactory.inviteValidator(validator1, 0, addressZero, { from: enterprise1 });
            await cohortFactory.inviteValidator(validator2, 0, addressZero, { from: enterprise1 });
            await cohortFactory.inviteValidator(validator3, 0, addressZero, { from: enterprise1 });

            await cohortFactory.acceptInvitation(enterprise1, 0, { from: validator1 });
            await cohortFactory.acceptInvitation(enterprise1, 1, { from: validator2 });
            await cohortFactory.acceptInvitation(enterprise1, 2, { from: validator3 });

        })

        it("Should succeed. Validator is added to existing cohort by legitimate Enterprise", async () => {

            await createCohort.grantRole(CONTROLLER_ROLE, cohortFactory.address, { from: owner });

            let result = await cohortFactory.createCohort(0, { from: enterprise1 });
            let event = result.logs[1];
            let cohortAddress = event.args.cohort;

            await cohortFactory.inviteValidator(validator4, 0, cohortAddress, { from: enterprise1 });

            result = await cohortFactory.acceptInvitation(enterprise1, 3, { from: validator4 });
            assert.lengthOf(result.logs, 1);
            event = result.logs[0];
            assert.equal(event.event, 'InvitationAccepted');
            assert.strictEqual(event.args.validator, validator4);
        })

        it("Should fail. Validator is added to existing cohort by random user", async () => {

            await createCohort.grantRole(CONTROLLER_ROLE, cohortFactory.address, { from: owner });

            let result = await cohortFactory.createCohort(0, { from: enterprise1 });
            let event = result.logs[1];
            let cohortAddress = event.args.cohort;

            try {
                await cohortFactory.inviteValidator(validator4, 0, cohortAddress, { from: owner });
            } catch (error) {
                ensureException(error);
            }

        })

        it("Should succeed. Validator is removed from existing cohort by legitimate Enterprise", async () => {

            await createCohort.grantRole(CONTROLLER_ROLE, cohortFactory.address, { from: owner });

            let result = await cohortFactory.createCohort(0, { from: enterprise1 });
            let event = result.logs[1];
            let cohortAddress = event.args.cohort;

            result = await cohortFactory.clearInvitationRemoveValidator(validator1, 0, cohortAddress, { from: enterprise1 });

            assert.lengthOf(result.logs, 1);
            event = result.logs[0];
            assert.equal(event.event, 'ValidatorCleared');
            assert.strictEqual(event.args.validator, validator1);
        })

        it("Should fail. Validator is removed from existing cohort by random user", async () => {

            await createCohort.grantRole(CONTROLLER_ROLE, cohortFactory.address, { from: owner });

            let result = await cohortFactory.createCohort(0, { from: enterprise1 });
            let event = result.logs[1];
            let cohortAddress = event.args.cohort;

            result = await cohortFactory.clearInvitationRemoveValidator(validator1, 0, cohortAddress, { from: owner });


        })

    })
    describe("Test governance updates", async () => {

        it("It should succeed. updateMinValidatorsPerCohort was updated by authorized user.", async () => {

            await cohortFactory.grantRole(SETTER_ROLE, owner, { from: owner });
            await cohortFactory.updateMinValidatorsPerCohort(10, 0, { from: owner });
            let newValue = await cohortFactory.minValidatorPerCohort(0);
            assert.strictEqual(newValue.toString(), "10");
        })


        it("It should fail. updateMinValidatorsPerCohort was updated by unauthorized user.", async () => {

            try {
                await cohortFactory.updateMinValidatorsPerCohort(5, 0, { from: owner });
            }
            catch (error) {
                ensureException(error);
            }
        })

        it("It should fail. updateMinValidatorsPerCohort was updated by unauthorized user but above the acceptable range.", async () => {


            await cohortFactory.grantRole(SETTER_ROLE, owner, { from: owner });
            try {
                await cohortFactory.updateMinValidatorsPerCohort(10, 6, { from: owner });

            }
            catch (error) {
                ensureException(error);
            }
        })
    })
})
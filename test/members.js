import {
    ensureException,
    duration
} from './helpers/utils.js';

const MEMBERS = artifacts.require('../Members');
const TOKEN = artifacts.require('../Token');
const Cohort = require('../build/contracts/Cohort.json');



contract("Member contract", (accounts) => {

    const owner = accounts[0];
    const enterprise1 = accounts[1];
    const validator1 = accounts[2];
    const validator2 = accounts[3];
    const validator3 = accounts[4];
    const validator4 = accounts[5];

    let members;
    let token;
    let auditTokenMin = "5000000000000000000000";
    let auditTokenLesMin = "1";
    let auditTokenMorMax = "25100000000000000000000";

    beforeEach(async () => {

        token = await TOKEN.new();

        members = await MEMBERS.new(token.address);

        let CONTROLLER_ROLE = web3.utils.keccak256("CONTROLLER_ROLE");
        await members.grantRole(CONTROLLER_ROLE, owner, { from: owner });
    })


    describe("Deploy", async () => {

        it("Should succeed. Initialize members with Audit token", async () => {

            let tokenAddress = await members.auditToken();
            assert.strictEqual(tokenAddress, token.address);
        })
    })

    describe("Enter Enterprise User", async () => {

        it("Should fail.Add enterprise user from unauthorized account", async () => {

            try {
                await members.addEnterpriseUser(enterprise1, "Enterprise 1", { from: enterprise1 });
            } catch (error) {
                ensureException(error);
            }

        })

        it("Should succeed. Add enterprise user from authorized account", async () => {
            const result = await members.addEnterpriseUser(enterprise1, "Enterprise 1", { from: owner });

            assert.lengthOf(result.logs, 1);

            let event = result.logs[0];
            assert.equal(event.event, 'EnterpriseUserAdded');
            assert.strictEqual(event.args.user, enterprise1);
            assert.strictEqual(event.args.name, "Enterprise 1");
        })


    })


    describe("Enter Validator User", async () => {

        it("Should fail. Add validator user from unauthorized account", async () => {

            try {
                await members.addValidatorUser(validator1, "Validator 1", { from: enterprise1 });
            } catch (error) {
                ensureException(error);
            }

        })

        it("Should succeed. Add validator user from authorized account", async () => {
            const result = await members.addValidatorUser(validator1, "Validator 1", { from: owner });

            assert.lengthOf(result.logs, 1);

            let event = result.logs[0];
            assert.equal(event.event, 'ValidatorUserAdded');
            assert.strictEqual(event.args.user, validator1);
            assert.strictEqual(event.args.name, "Validator 1");
        })


    })

    describe("Stake", async () => {

        beforeEach(async () => {

            await members.addValidatorUser(validator1, "Validators 1", { from: owner });
            await token.transfer(validator1, auditTokenMin, { from: owner });
            await token.approve(members.address, auditTokenMin, { from: validator1 });
        })

        it("Should succeed. Validator stakes tokens.", async () => {

            let result = await members.stake(auditTokenMin, { from: validator1 });
            assert.lengthOf(result.logs, 1);

            let event = result.logs[0];
            assert.equal(event.event, 'LogDepositReceived');
            assert.strictEqual(event.args.from, validator1);
            assert.strictEqual(event.args.amount.toString(), auditTokenMin);
        })

        it("Should fail. User hasn't been registered as validator.", async () => {
            try {
                let result = await members.stake(auditTokenMin, { from: validator2 });
            } catch (error) {
                ensureException(error);
            }
        })

        it("Should fail. User contributed less than required amount.", async () => {

            try {
                let result = await members.stake(auditTokenLesMin, { from: validator1 });
            } catch (error) {
                ensureException(error);
            }

        })

        it("Should fail. User contributed more than required amount.", async () => {

            await members.addValidatorUser(validator2, "Validators 2", { from: owner });
            await token.transfer(validator2, auditTokenMorMax, { from: owner });
            await token.approve(members.address, auditTokenMorMax, { from: validator2 });

            try {
                let result = await members.stake(auditTokenMorMax, { from: validator2 });
            } catch (error) {
                ensureException(error);
            }

        })

    })

   
})
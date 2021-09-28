import { assert } from 'chai';
import { en } from 'ethers/wordlists';
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


var BigNumber = require('big-number');
let SETTER_ROLE = web3.utils.keccak256("SETTER_ROLE");
import expectRevert from './helpers/expectRevert';




contract("Deposit Modifiers contract", (accounts) => {

    const admin = accounts[0];
    const enterprise1 = accounts[1];
    const validator1 = accounts[2];
    const validator2 = accounts[3];
    const validator3 = accounts[4];
    const dataSubscriber = accounts[5];
    const platformAccount = accounts[6];


    let members;
    let token;
    let memberHelpers;
    let cohortFactory;
    let nodeOperations;
    let depositModifiers;
    let CONTROLLER_ROLE;

    let auditTokenMin = "5000000000000000000000";
    let auditTokenMax = "25000000000000000000000";

    CONTROLLER_ROLE = web3.utils.keccak256("CONTROLLER_ROLE");

    beforeEach(async () => {

        token = await TOKEN.new(admin);
        members = await MEMBERS.new(platformAccount);
        memberHelpers = await MEMBER_HELPERS.new(members.address, token.address)

        cohortFactory = await COHORTFACTORY.new(members.address, memberHelpers.address);
        nodeOperations = await NODE_OPERATIONS.new(memberHelpers.address, token.address, members.address);
        depositModifiers = await DEPOSIT_MODIFIERS.new(members.address, token.address, memberHelpers.address, cohortFactory.address, nodeOperations.address)

        await memberHelpers.grantRole(CONTROLLER_ROLE, admin, { from: admin });
        await members.grantRole(CONTROLLER_ROLE, admin, { from: admin });
        await memberHelpers.grantRole(CONTROLLER_ROLE, depositModifiers.address, { from: admin });

    })


    describe("Deploy", async () => {

        it("Should succeed. Initialize members with Audit token", async () => {

            let tokenAddress = await depositModifiers.auditToken();
            assert.strictEqual(tokenAddress, token.address);
        })
    })


    describe("Data subscriber subscribes to cohorts", async () => {

        beforeEach(async () => {

            await members.addUser(enterprise1, "Enterprise 1", 0, { from: admin });
            await members.addUser(validator1, "Validators 1", 1, { from: admin });
            await members.addUser(validator2, "Validators 2", 1, { from: admin });
            await members.addUser(validator3, "Validators 3", 1, { from: admin });
            await members.addUser(dataSubscriber, "DataSubscriberr 1", 2, { from: admin });

            await token.transfer(validator1, auditTokenMax, { from: admin });
            await token.transfer(validator2, auditTokenMin, { from: admin });
            await token.transfer(validator3, auditTokenMin, { from: admin });
            await token.transfer(dataSubscriber, auditTokenMin, { from: admin });


            await token.approve(memberHelpers.address, auditTokenMax, { from: validator1 });
            await token.approve(memberHelpers.address, auditTokenMin, { from: validator2 });
            await token.approve(memberHelpers.address, auditTokenMin, { from: validator3 });
            await token.approve(memberHelpers.address, auditTokenMin, { from: dataSubscriber });


            await memberHelpers.stake(auditTokenMax, { from: validator1 });
            await memberHelpers.stake(auditTokenMin, { from: validator2 });
            await memberHelpers.stake(auditTokenMin, { from: validator3 });
            await memberHelpers.stake(auditTokenMin, { from: dataSubscriber });



            await cohortFactory.inviteValidator(validator1, 0, { from: enterprise1 });
            await cohortFactory.inviteValidator(validator2, 0, { from: enterprise1 });
            await cohortFactory.inviteValidator(validator3, 0, { from: enterprise1 });

            await cohortFactory.acceptInvitation(enterprise1, 0, { from: validator1 });
            await cohortFactory.acceptInvitation(enterprise1, 1, { from: validator2 });
            await cohortFactory.acceptInvitation(enterprise1, 2, { from: validator3 });

            let result = await cohortFactory.createCohort(0, { from: enterprise1 });
            assert.lengthOf(result.logs, 1);

            let event = result.logs[0];
            assert.equal(event.event, 'CohortCreated');

        })

        it("Should succeed. Data subscriber subscribed to view data feeds.", async () => {

            let accessFee = await members.accessFee();
            await token.transfer(dataSubscriber, auditTokenMin, { from: admin });
            await token.approve(depositModifiers.address, accessFee, { from: dataSubscriber });

            const balanceBefore = await token.balanceOf(platformAccount);
            let result = await depositModifiers.dataSubscriberPayment(enterprise1, 0, { from: dataSubscriber });
            assert.lengthOf(result.logs, 4);

            let event = result.logs[3];
            assert.equal(event.event, 'LogDataSubscriberPaid');
            let enterpriseBalance = await memberHelpers.deposits(enterprise1);
            let validator1Balance = await memberHelpers.deposits(validator1);
            let validator2Balance = await memberHelpers.deposits(validator2);
            let validator3Balance = await memberHelpers.deposits(validator3);

            let totalValidatorAmt = (validator1Balance - auditTokenMax) + (validator2Balance - auditTokenMin) + (validator3Balance - auditTokenMin);

            const platformBalance = await token.balanceOf(platformAccount);

            assert.strictEqual(enterpriseBalance.toString(), (accessFee * 40 / 100).toString());
            assert.strictEqual(totalValidatorAmt.toString(), (accessFee * 40 / 100).toString());
            assert.strictEqual(platformBalance.toString(), (accessFee * 20 / 100).toString());

        })

        it("Should fail. Data subscriber didn't authorize depositModifiers contract to withdraw funds.", async () => {

            await token.transfer(dataSubscriber, auditTokenMin, { from: admin });

            try {
                await depositModifiers.dataSubscriberPayment(enterprise1, 0, { from: dataSubscriber });
                expectRevert()

            } catch (error) {
                ensureException(error);
            }

        })

        it("Should fail. Data subscriber didn't approve sufficiently spending contract", async () => {

            let accessFee = await members.accessFee();
            await token.approve(depositModifiers.address, accessFee, { from: dataSubscriber });

            try {
                await depositModifiers.dataSubscriberPayment(enterprise1, 0, { from: dataSubscriber });
                expectRevert()

            } catch (error) {
                ensureException(error);
            }
        })
    })



   
})
import {
    ensureException,
    duration
} from './helpers/utils.js';

const MEMBERS = artifacts.require('../Members');
const TOKEN = artifacts.require('../AuditToken');
const COHORTFACTORY = artifacts.require('../CohortFactory');
const Cohort = require('../build/contracts/Cohort.json');
const CREATECOHORT = artifacts.require('../CreateCohort');



contract("create Cohort contract", (accounts) => {

    const owner = accounts[0];
    const enterprise1 = accounts[1];
    const validator1 = accounts[2];
    const validator2 = accounts[3];
    const validator3 = accounts[4];
    const validator4 = accounts[5];
    const platformAccount = accounts[6];

    let members;
    let token;
    let cohortFactory;
    let createCohort;
    let auditTokenMin = "5000000000000000000000";
    let auditTokenLesMin = "1";
    let auditTokenMorMax = "25100000000000000000000";

    let CONTROLLER_ROLE = web3.utils.keccak256("CONTROLLER_ROLE");

    beforeEach(async () => {

        token = await TOKEN.new(owner);

        members = await MEMBERS.new(token.address, platformAccount);
        createCohort = await CREATECOHORT.new(members.address, token.address)
       
    })


    describe("Deploy", async () => {

        it("Should succeed. Initialize createCohort with Audit token and members contract", async () => {

            let createCohort = await CREATECOHORT.new(members.address, token.address)
            let membersAddress = await createCohort.members();
            let tokenAddress = await createCohort.auditToken();
            assert.strictEqual(tokenAddress, token.address);
            assert.strictEqual(membersAddress, members.address);

        })
    })

    describe("Create Cohort", async () => {


        it("Should succeed. Cohort created by enterprise", async () => {

            let validatorList = [validator1, validator2, validator3];

            await createCohort.grantRole(CONTROLLER_ROLE, owner, { from: owner });


            let result = await createCohort.createCohort(0, validatorList, enterprise1, { from: owner });


            assert.lengthOf(result.logs, 2);

            let event = result.logs[1];
            assert.equal(event.event, 'CohortCreatedFinal');
            let cohortAddress = event.args.cohort;

            var cohortContract = new web3.eth.Contract(Cohort["abi"], cohortAddress);
            let enterpriseInCohort = await cohortContract.methods.enterprise().call();
            assert.strictEqual(enterpriseInCohort, enterprise1);
        })

        it("Should fail. Cohort not created by authorized party", async () => {

            let validatorList = [validator1, validator2, validator3];

            try {
                let result = await createCohort.createCohort(0, validatorList, enterprise1, { from: owner });

            } catch (error) {
                ensureException(error);
            }

        })

        it("Should succeed. Returns correct validator count", async () => {

            let validatorList = [validator1, validator2, validator3];
            await createCohort.grantRole(CONTROLLER_ROLE, owner, { from: owner });
            let result = await createCohort.createCohort(0, validatorList, enterprise1, { from: owner });
            let validatorCount = await createCohort.returnValidatorCohortsCount(validator1);
            assert.strictEqual("1", validatorCount.toString());

        })
       
    });
})
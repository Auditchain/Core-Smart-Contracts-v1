import {
    ensureException,
    duration
} from './helpers/utils.js';

const MEMBERS = artifacts.require('../Members');
const TOKEN = artifacts.require('../AuditToken');
const COHORTFACTORY = artifacts.require('../CohortFactory');

const Cohort = require('../build/contracts/Cohort.json');
const CREATECOHORT = artifacts.require('../CreateCohort');



contract("Cohort contract", (accounts) => {

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
    let rewardTokensHalf = "341500000000000000000";
    let rewardTokens = "1000000000000000000";

    let cohortAddress;
    let cohortContract;
    let result;
    let SETTER_ROLE = web3.utils.keccak256("SETTER_ROLE");

    beforeEach(async () => {

        token = await TOKEN.new(owner);

        members = await MEMBERS.new(token.address, platformAccount);

        createCohort = await CREATECOHORT.new(members.address, token.address)
        cohortFactory = await COHORTFACTORY.new(members.address, createCohort.address);

        let CONTROLLER_ROLE = web3.utils.keccak256("CONTROLLER_ROLE");
        await members.grantRole(CONTROLLER_ROLE, owner, { from: owner });
        await members.setCohortFactory(cohortFactory.address, { from: owner });
        await createCohort.grantRole(CONTROLLER_ROLE, cohortFactory.address, { from: owner });





        await members.addEnterpriseUser(enterprise1, "Enterprise 1", { from: owner });
        await members.addValidatorUser(validator1, "Validators 1", { from: owner });
        await members.addValidatorUser(validator2, "Validators 2", { from: owner });
        await members.addValidatorUser(validator3, "Validators 3", { from: owner });

        await token.transfer(validator1, auditTokenMin, { from: owner });
        await token.transfer(validator2, auditTokenMin, { from: owner });
        await token.transfer(validator3, auditTokenMin, { from: owner });
        await token.transfer(enterprise1, auditTokenMin, { from: owner });

        await token.approve(members.address, auditTokenMin, { from: validator1 });
        await token.approve(members.address, auditTokenMin, { from: validator2 });
        await token.approve(members.address, auditTokenMin, { from: validator3 });

        await members.stake(auditTokenMin, { from: validator1 });
        await members.stake(auditTokenMin, { from: validator2 });
        await members.stake(auditTokenMin, { from: validator3 });


        await cohortFactory.inviteValidator(validator1, 0, { from: enterprise1 });
        await cohortFactory.inviteValidator(validator2, 0, { from: enterprise1 });
        await cohortFactory.inviteValidator(validator3, 0, { from: enterprise1 });
        await cohortFactory.acceptInvitation(enterprise1, 0, { from: validator1 });
        await cohortFactory.acceptInvitation(enterprise1, 1, { from: validator2 });
        await cohortFactory.acceptInvitation(enterprise1, 2, { from: validator3 });

        // let result = await cohortFactory.createCohort(0, { from: enterprise1 });
        result = await cohortFactory.createCohort(0, { from: enterprise1 });

        // let role = await cohortContract.methods.getRoleAdmin().call();

        assert.lengthOf(result.logs, 2);

        let event = result.logs[1];
        assert.equal(event.event, 'CohortCreated');
        cohortAddress = event.args.cohort;
        cohortContract = new web3.eth.Contract(Cohort["abi"], cohortAddress);

        await cohortContract.methods.grantRole(CONTROLLER_ROLE, owner).send({ from: owner });
        // await token.setController(cohortAddress, { from: owner });
        await token.grantRole(CONTROLLER_ROLE, cohortAddress, { from: owner });
    })


    describe("Deploy", async () => {

        it("Should succeed. Cohort deployed and initialized", async () => {

            // let result = await cohortFactory.createCohort(0, { from: enterprise1 });

            // let role = await cohortContract.methods.getRoleAdmin().call();

            assert.lengthOf(result.logs, 2);

            let event = result.logs[1];
            assert.equal(event.event, 'CohortCreated');
            let cohortAddress = event.args.cohort;

            let cohortContract = new web3.eth.Contract(Cohort["abi"], cohortAddress);
            let enterpriseInCohort = await cohortContract.methods.enterprise().call();
            assert.strictEqual(enterpriseInCohort, enterprise1);
        })
    })

    describe("Test simple updates", async () => {

        it("It should succeed. Quorum amount was updated by authorized user.", async () => {

            await cohortContract.methods.updateQuorum("20").send({ from: owner });
            let newQuorum = await cohortContract.methods.requiredQuorum().call();
            assert.strictEqual(newQuorum.toString(), "20");
        })


        it("It should fail. Quorum amount was updated by unauthorized user.", async () => {

            try {
                await cohortContract.methods.updateQuorum("20").send({ from: enterprise1 });
            }
            catch (error) {
                ensureException(error);
            }
        })
    })


    describe("Initialize validation", async () => {

        it("Should succeed. Validation initialized by proper enterprise who is funded", async () => {

            let documentHash = web3.utils.soliditySha3("2+2=4");
            await token.transfer(enterprise1, auditTokenMin, { from: owner });
            await token.approve(members.address, auditTokenMin, { from: enterprise1 });
            await members.stake(auditTokenMin, { from: enterprise1 });
            let result = await cohortContract.methods.initializeValidation(documentHash).send({ from: enterprise1 });

            let validationTime = result.events.ValidationInitialized.returnValues.initTime;
            let validationHash = web3.utils.soliditySha3(documentHash, validationTime);

            assert.strictEqual(result.events.ValidationInitialized.returnValues.validationHash, validationHash);
            assert.strictEqual(result.events.ValidationInitialized.returnValues.enterprise, enterprise1);

        })

        it("Should fail. Validation initialized by proper enterprise who is not funded", async () => {

            let documentHash = web3.utils.soliditySha3("2+2=4");
            try {
                let result = await cohortContract.methods.initializeValidation(documentHash).send({ from: enterprise1 });
            }
            catch (error) {
                ensureException(error);
            }                        
        })


        it("Should fail. Validation initialized by improper enterprise", async () => {

            let documentHash = web3.utils.soliditySha3("2+2=4");

            try {
                let result = await cohortContract.methods.initializeValidation(documentHash).send({ from: owner });
            }
            catch (error) {
                ensureException(error);
            }
        })
    })

    describe("Validate document", async () => {

        let validationInitTime;
        let documentHash;

        beforeEach(async () => {
            await token.transfer(enterprise1, auditTokenMin, { from: owner });
            await token.approve(members.address, auditTokenMin, { from: enterprise1 });
            await members.stake(auditTokenMin, { from: enterprise1 });
            documentHash = web3.utils.soliditySha3("2+2=4");
            let result = await cohortContract.methods.initializeValidation(documentHash).send({ from: enterprise1 });
            validationInitTime = result.events.ValidationInitialized.returnValues.initTime;

        })

        it("Should succeed. Validation executed by proper validator and proper values are passed", async () => {

            let result = await cohortContract.methods.validate(documentHash, validationInitTime, 1).send({ from: validator3, gas: 200000 });
            assert.strictEqual(result.events.ValidatorValidated.returnValues.decision.toString(), "1");
            assert.strictEqual(result.events.ValidatorValidated.returnValues.documentHash, documentHash);
        })

        it("Should fail. Validation attested by proper validator but improper document hash is sent.", async () => {

            documentHash = web3.utils.soliditySha3("2+2=4");
            try {
                let result = await cohortContract.methods.validate(documentHash, validationInitTime, 1).send({ from: validator3, gas: 200000 });
            } catch (error) {
                ensureException(error);
            }
        })

        it("Should fail. Validation attested by proper validator but improper init time is sent.", async () => {

            try {
                let result = await cohortContract.methods.validate(documentHash, "1", 1).send({ from: validator3, gas: 200000 });
            } catch (error) {
                ensureException(error);
            }
        })

        it("Should fail. Validation attested by improper validator while all params are correct.", async () => {

            try {
                let result = await cohortContract.methods.validate(documentHash, validationInitTime, 1).send({ from: owner, gas: 200000 });
            } catch (error) {
                ensureException(error);
            }

        })
    })






    describe("Check if validator has validated specific document", async () => {

        let validationInitTime;
        let documentHash;
        let validationHash

        beforeEach(async () => {
            await token.transfer(enterprise1, auditTokenMin, { from: owner });
            await token.approve(members.address, auditTokenMin, { from: enterprise1 });
            await members.stake(auditTokenMin, { from: enterprise1 });
            documentHash = web3.utils.soliditySha3("2+2=4");
            let result = await cohortContract.methods.initializeValidation(documentHash).send({ from: enterprise1 });
            validationInitTime = result.events.ValidationInitialized.returnValues.initTime;
            validationHash = web3.utils.soliditySha3(documentHash, validationInitTime);

        })


        it("It should succeed. The return value should be true.", async () => {

            await cohortContract.methods.validate(documentHash, validationInitTime, 1).send({ from: validator3, gas: 200000 });
            let isValidated = await cohortContract.methods.isValidated(validationHash).call({ from: validator3 });

            assert.strictEqual(isValidated.toString(), "1");
        })

        it("It should succeed. The return value should be false.", async () => {           
            let isValidated = await cohortContract.methods.isValidated(validationHash).call({ from: validator3 });

            assert.strictEqual(isValidated.toString(), "0");
        })
    })

    describe("Calculate Vote Quorum", async () => {

        let validationInitTime;
        let documentHash;
        let validationHash

        beforeEach(async () => {
            await token.transfer(enterprise1, auditTokenMin, { from: owner });
            await token.approve(members.address, auditTokenMin, { from: enterprise1 });
            await members.stake(auditTokenMin, { from: enterprise1 });
            documentHash = web3.utils.soliditySha3("2+2=4");
            let result = await cohortContract.methods.initializeValidation(documentHash).send({ from: enterprise1 });
            validationInitTime = result.events.ValidationInitialized.returnValues.initTime;
            validationHash = web3.utils.soliditySha3(documentHash, validationInitTime);

        })


        it("Should succeed. Calculation is done against valid validation.", async () => {


            await cohortContract.methods.validate(documentHash, validationInitTime, 1).send({ from: validator3, gas: 200000 });
            let quorum = await cohortContract.methods.calculateVoteQuorum(validationHash).call();

            assert.strictEqual(quorum.toString(), "33");
        })

        it("Should succeed. Calculation is done against valid validation with wrong time. ", async () => {


            await cohortContract.methods.validate(documentHash, validationInitTime, 1).send({ from: validator3, gas: 200000 });
            try {
                let quorum = await cohortContract.methods.calculateVoteQuorum(validationHash).call();
            } catch (error) {
                ensureException(error);
            }
        })
    })

    describe("Collect Validation Results", async () => {

        let validationInitTime;
        let documentHash;
        let validationHash

        beforeEach(async () => {
            await token.transfer(enterprise1, auditTokenMin, { from: owner });
            await token.approve(members.address, auditTokenMin, { from: enterprise1 });
            await members.stake(auditTokenMin, { from: enterprise1 });
            documentHash = web3.utils.soliditySha3("2+2=4");
            let result = await cohortContract.methods.initializeValidation(documentHash).send({ from: enterprise1 });
            validationInitTime = result.events.ValidationInitialized.returnValues.initTime;
            validationHash = web3.utils.soliditySha3(documentHash, validationInitTime);

        })

        it("Should succeed. CollectValidationResults has been called by controller", async () => {

            await cohortContract.methods.validate(documentHash, validationInitTime, 0).send({ from: validator1, gas: 200000 });
            await cohortContract.methods.validate(documentHash, validationInitTime, 0).send({ from: validator2, gas: 200000 });
            await cohortContract.methods.validate(documentHash, validationInitTime, 1).send({ from: validator3, gas: 200000 });

            let status = await cohortContract.methods.collectValidationResults(validationHash).call({ from: owner });

            assert.strictEqual(status[0][0], validator1);
            assert.strictEqual(status[1][0].toString(), auditTokenMin);
            assert.strictEqual(status[2][0].toString(), "0");
        })



        it("Should fail. CollectValidationResults has been called by random user", async () => {

            await cohortContract.methods.validate(documentHash, validationInitTime, 0).send({ from: validator1, gas: 200000 });
            await cohortContract.methods.validate(documentHash, validationInitTime, 0).send({ from: validator2, gas: 200000 });
            await cohortContract.methods.validate(documentHash, validationInitTime, 1).send({ from: validator3, gas: 200000 });

            try {
                let status = await cohortContract.methods.collectValidationResults(validationHash).call({ from: validator2 });
            } catch (error) {
                ensureException(error);
            }


        })
    })



})
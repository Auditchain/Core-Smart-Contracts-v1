import {
    ensureException,
    duration
} from './helpers/utils.js';

const MEMBERS = artifacts.require('../Members');
const TOKEN = artifacts.require('../Token');
const COHORTFACTORY = artifacts.require('../CohortFactory');

const Cohort = require('../build/contracts/Cohort.json');



contract("Cohort contract", (accounts) => {

    const owner = accounts[0];
    const enterprise1 = accounts[1];
    const validator1 = accounts[2];
    const validator2 = accounts[3];
    const validator3 = accounts[4];
    const validator4 = accounts[5];

    let members;
    let token;
    let cohortFactory;

    let auditTokenMin = "5000000000000000000000";
    let rewardTokensHalf = "341500000000000000000";

    let cohortAddress;
    let cohortContract;
    let result;

    beforeEach(async () => {

        token = await TOKEN.new();

        members = await MEMBERS.new(token.address);

        cohortFactory = await COHORTFACTORY.new(members.address, token.address);


        let CONTROLLER_ROLE = web3.utils.keccak256("CONTROLLER_ROLE");
        await members.grantRole(CONTROLLER_ROLE, owner, { from: owner });



        await members.addEnterpriseUser(enterprise1, "Enterprise 1", { from: owner });
        await members.addValidatorUser(validator1, "Validators 1", { from: owner });
        await members.addValidatorUser(validator2, "Validators 2", { from: owner });
        await members.addValidatorUser(validator3, "Validators 3", { from: owner });

        await token.transfer(validator1, auditTokenMin, { from: owner });
        await token.transfer(validator2, auditTokenMin, { from: owner });
        await token.transfer(validator3, auditTokenMin, { from: owner });

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

        console.log("cohort address:", cohortAddress);

        cohortContract = new web3.eth.Contract(Cohort["abi"], cohortAddress);


        await cohortContract.methods.grantRole(CONTROLLER_ROLE, owner).send({ from: owner });
        await token.setController(cohortAddress, { from: owner });
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


    describe("Initialize validation", async () => {

        it("Should succeed. Validation initialized by proper enterprise", async () => {

            let documentHash = web3.utils.soliditySha3("2+2=4");
            let result = await cohortContract.methods.initializeValidation(documentHash).send({ from: enterprise1 });

            let validationTime = result.events.ValidationInitialized.returnValues.initTime;
            let validationHash = web3.utils.soliditySha3(documentHash, validationTime);

            assert.strictEqual(result.events.ValidationInitialized.returnValues.validationHash, validationHash);
            assert.strictEqual(result.events.ValidationInitialized.returnValues.enterprise, enterprise1);


            // await cohortContract.methods.returnValidationStatus(validator2, validationHash).call();


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

    describe("Attest documents", async () => {
        it("Should succeed. Validation attested by proper validator and proper values are passed", async () => {
            let documentHash = web3.utils.soliditySha3("2+2=4");
            console.log("document hash:" + documentHash);

            result = await cohortContract.methods.initializeValidation(documentHash).send({ from: enterprise1 });
            let validationInitTime = result.events.ValidationInitialized.returnValues.initTime;
            // let validationHash = web3.utils.soliditySha3(documentHash, validationInitTime);

            let result = await cohortContract.methods.validate(documentHash, validationInitTime, 1).send({ from: validator3, gas: 200000 });


            assert.strictEqual(result.events.ValidatorValidated.returnValues.decision.toString(), "1");
            assert.strictEqual(result.events.ValidatorValidated.returnValues.documentHash, documentHash);
        })

        it("Should fail. Validation attested by proper validator but improper document hash is sent.", async () => {
            let documentHash = web3.utils.soliditySha3("2+1=4");
            console.log("document hash:" + documentHash);

            result = await cohortContract.methods.initializeValidation(documentHash).send({ from: enterprise1 });
            let validationInitTime = result.events.ValidationInitialized.returnValues.initTime;

            documentHash = web3.utils.soliditySha3("2+2=4");
            try {
                let result = await cohortContract.methods.validate(documentHash, validationInitTime, 1).send({ from: validator3, gas: 200000 });
            } catch (error) {
                ensureException(error);
            }

        })

        it("Should fail. Validation attested by proper validator but improper init time is sent.", async () => {
            let documentHash = web3.utils.soliditySha3("2+1=4");
            console.log("document hash:" + documentHash);

            result = await cohortContract.methods.initializeValidation(documentHash).send({ from: enterprise1 });
            let validationInitTime = result.events.ValidationInitialized.returnValues.initTime;



            try {
                let result = await cohortContract.methods.validate(documentHash, "1", 1).send({ from: validator3, gas: 200000 });
            } catch (error) {
                ensureException(error);
            }

        })

        it("Should fail. Validation attested by improper validator while all params are correct.", async () => {
            let documentHash = web3.utils.soliditySha3("2+1=4");
            console.log("document hash:" + documentHash);

            result = await cohortContract.methods.initializeValidation(documentHash).send({ from: enterprise1 });
            let validationInitTime = result.events.ValidationInitialized.returnValues.initTime;



            try {
                let result = await cohortContract.methods.validate(documentHash, validationInitTime, 1).send({ from: owner, gas: 200000 });
            } catch (error) {
                ensureException(error);
            }

        })
    })


    describe("Add daily earnings", async () => {

        it("Should succeed. Add daily earnings by validators called by controller. ", async () => {

            
            let validatorsToSend = [validator1, validator2, validator3];
            let amountsToSend = [rewardTokensHalf, rewardTokensHalf, rewardTokensHalf];


            let result = await cohortContract.methods.updateDailyEarningsTransferFunds(validatorsToSend, amountsToSend).send({ from: owner, gas: 200000 });
            let timeDeposited = result.events.RewardsDeposited.returnValues.timeStamp;
            let cohort = result.events.RewardsDeposited.returnValues.cohort;


            let amountPerDay = cohortContract.methods.amountTokensPerDay().call();
            let tokenBalance = token.balanceOf(cohortAddress);

            assert.strictEqual(tokenBalance.toString(), amountPerDay.toString());
            assert.strictEqual(cohort, cohortAddress);


            


        })

        it("Should fail. Add daily earnings by validators called by random user", async () => {

            let validatorsToSend = [validator1, validator2, validator3];
            let amountsToSend = [rewardTokensHalf, rewardTokensHalf, rewardTokensHalf];

           
            try {
                await cohortContract.methods.updateDailyEarningsTransferFunds(validatorsToSend, amountsToSend).send({ from: validator2 });
            } catch (error) {
                ensureException(error);
            }

        })
    })

    describe("Claim rewards- redeem", async () => {

        it("Should succeed. Claim rewards by validator who has earned some funds. ", async () => {

            let validatorsToSend = [validator1, validator2, validator3];
            let amountsToSend = [rewardTokensHalf, rewardTokensHalf, rewardTokensHalf];


            await cohortContract.methods.updateDailyEarningsTransferFunds(validatorsToSend, amountsToSend).send({ from: owner, gas: 200000 });
            let result = await cohortContract.methods.redeem().send({from:validator1});

            let amountEarned = result.events.LogRewardsRedeemed.returnValues.amount;

            assert.strictEqual(amountEarned.toString(), "341500000000000000000");

            // console.log("amountEarned:" + amountEarned);

        })

        it("Should fail. Claim rewards by validator who has no funds. ", async () => {

            let validatorsToSend = [validator1, validator2, validator3];
            let amountsToSend = [rewardTokensHalf, rewardTokensHalf, rewardTokensHalf];


            await cohortContract.methods.updateDailyEarningsTransferFunds(validatorsToSend, amountsToSend).send({ from: owner, gas: 200000 });
            let result = await cohortContract.methods.redeem().send({from:validator1});

        })

    })

    describe("Calculate Vote Quorum", async () => {

        it("Should succeed. Calculation is done against valid validation.", async () => {

            let documentHash = web3.utils.soliditySha3("2+1=4");
            console.log("document hash:" + documentHash);

            let result = await cohortContract.methods.initializeValidation(documentHash).send({ from: enterprise1 });
            let validationInitTime = result.events.ValidationInitialized.returnValues.initTime;
            let validationHash = web3.utils.soliditySha3(documentHash, validationInitTime);

            await cohortContract.methods.validate(documentHash, validationInitTime, 1).send({ from: validator3, gas: 200000 });

            let quorum = await cohortContract.methods.calculateVoteQuorum(validationHash).call();
            console.log("quorum:", quorum);
            assert.strictEqual(quorum.toString(), "33");


        })

        it("Should succeed. Calculation is done against valid validation with wrong time. ", async () => {

            let documentHash = web3.utils.soliditySha3("2+1=4");
            console.log("document hash:" + documentHash);

            let result = await cohortContract.methods.initializeValidation(documentHash).send({ from: enterprise1 });
            let validationInitTime = result.events.ValidationInitialized.returnValues.initTime;
            let validationHash = web3.utils.soliditySha3(documentHash, 1);

            await cohortContract.methods.validate(documentHash, validationInitTime, 1).send({ from: validator3, gas: 200000 });

            try {
                let quorum = await cohortContract.methods.calculateVoteQuorum(validationHash).call();
            } catch (error) {
                ensureException(error);
            }
        })
    })

    describe("Collect Validation Results", async () => {

        it("Should succeed. Validation has been called by controller", async () => {


            let documentHash = web3.utils.soliditySha3("2+1=4");
            // console.log("document hash:" + documentHash);

            let result = await cohortContract.methods.initializeValidation(documentHash).send({ from: enterprise1 });
            let validationInitTime = result.events.ValidationInitialized.returnValues.initTime;
            let validationHash = web3.utils.soliditySha3(documentHash, validationInitTime);

            await cohortContract.methods.validate(documentHash, validationInitTime, 0).send({ from: validator1, gas: 200000 });
            await cohortContract.methods.validate(documentHash, validationInitTime, 0).send({ from: validator2, gas: 200000 });
            await cohortContract.methods.validate(documentHash, validationInitTime, 1).send({ from: validator3, gas: 200000 });

            let status = await cohortContract.methods.collectValidationResults(validationHash).call({ from: owner });

            console.log("status", status);
            assert.strictEqual(status[0][0], validator1);
            assert.strictEqual(status[1][0].toString(), auditTokenMin);
            assert.strictEqual(status[2][0].toString(), "0");
        })
    })

    describe("Collect Validation Results", async () => {

        it("Should fail. Validation has been called by random user", async () => {


            let documentHash = web3.utils.soliditySha3("2+1=4");
            // console.log("document hash:" + documentHash);

            let result = await cohortContract.methods.initializeValidation(documentHash).send({ from: enterprise1 });
            let validationInitTime = result.events.ValidationInitialized.returnValues.initTime;
            let validationHash = web3.utils.soliditySha3(documentHash, validationInitTime);

            await cohortContract.methods.validate(documentHash, validationInitTime, 0).send({ from: validator1, gas: 200000 });
            await cohortContract.methods.validate(documentHash, validationInitTime, 0).send({ from: validator2, gas: 200000 });
            await cohortContract.methods.validate(documentHash, validationInitTime, 1).send({ from: validator3, gas: 200000 });
            try{
            let status = await cohortContract.methods.collectValidationResults(validationHash).call({ from: validator2 });
            }catch(error) {
                ensureException(error);
            }
            
        })
    })



})
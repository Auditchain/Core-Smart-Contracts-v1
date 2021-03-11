import { assert } from 'chai';
import { en } from 'ethers/wordlists';
import {
    ensureException,
    duration
} from './helpers/utils.js';

const MEMBERS = artifacts.require('../Members');
const TOKEN = artifacts.require('../AuditToken');
const Cohort = require('../build/contracts/Cohort.json');
const COHORTFACTORY = artifacts.require('../CohortFactory');
const CREATECOHORT = artifacts.require('../CreateCohort');

var BigNumber = require('big-number');
let SETTER_ROLE = web3.utils.keccak256("SETTER_ROLE");



contract("Member contract", (accounts) => {

    const owner = accounts[0];
    const enterprise1 = accounts[1];
    const validator1 = accounts[2];
    const validator2 = accounts[3];
    const validator3 = accounts[4];
    const dataSubscriber = accounts[5];
    const platformAccount = accounts[6];
    const validator4 = accounts[7];


    let members;
    let token;
    let cohortFactory;
    let createCohort;
    let CONTROLLER_ROLE;

    let auditTokenMin = "5000000000000000000000";
    let auditTokenLesMin = "1";
    let auditTokenMorMax = "25100000000000000000000";
    let auditTokenMax = "25000000000000000000000";

    let rewardTokens = "1000000000000000000";

    beforeEach(async () => {

        token = await TOKEN.new(owner);

        members = await MEMBERS.new(token.address, platformAccount);
        createCohort = await CREATECOHORT.new(members.address, token.address)
        cohortFactory = await COHORTFACTORY.new(members.address, createCohort.address);

        CONTROLLER_ROLE = web3.utils.keccak256("CONTROLLER_ROLE");
        await members.grantRole(CONTROLLER_ROLE, owner, { from: owner });
        await members.setCohortFactory(cohortFactory.address, { from: owner });
        await createCohort.grantRole(CONTROLLER_ROLE, cohortFactory.address, { from: owner });
        await token.grantRole(CONTROLLER_ROLE, members.address, { from: owner });
    })


    // describe("Deploy", async () => {

    //     it("Should succeed. Initialize members with Audit token", async () => {

    //         let tokenAddress = await members.auditToken();
    //         assert.strictEqual(tokenAddress, token.address);
    //     })
    // })

    // describe("Enter Enterprise User", async () => {

    //     it("Should fail.Add enterprise user from unauthorized account", async () => {

    //         try {
    //             await members.addEnterpriseUser(enterprise1, "Enterprise 1", { from: enterprise1 });
    //         } catch (error) {
    //             ensureException(error);
    //         }

    //     })

    //     it("Should succeed. Add enterprise user from authorized account", async () => {
    //         const result = await members.addEnterpriseUser(enterprise1, "Enterprise 1", { from: owner });

    //         assert.lengthOf(result.logs, 1);

    //         let event = result.logs[0];
    //         assert.equal(event.event, 'EnterpriseUserAdded');
    //         assert.strictEqual(event.args.user, enterprise1);
    //         assert.strictEqual(event.args.name, "Enterprise 1");
    //     })


    // })


    // describe("Enter Validator User", async () => {

    //     it("Should fail. Add validator user from unauthorized account", async () => {

    //         try {
    //             await members.addValidatorUser(validator1, "Validator 1", { from: enterprise1 });
    //         } catch (error) {
    //             ensureException(error);
    //         }

    //     })

    //     it("Should succeed. Add validator user from authorized account", async () => {
    //         const result = await members.addValidatorUser(validator1, "Validator 1", { from: owner });

    //         assert.lengthOf(result.logs, 1);

    //         let event = result.logs[0];
    //         assert.equal(event.event, 'ValidatorUserAdded');
    //         assert.strictEqual(event.args.user, validator1);
    //         assert.strictEqual(event.args.name, "Validator 1");
    //     })


    // })

    // describe("Stake by validators", async () => {

    //     beforeEach(async () => {

    //         await members.addValidatorUser(validator1, "Validators 1", { from: owner });
    //         await token.transfer(validator1, auditTokenMin, { from: owner });
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

    //         await members.addValidatorUser(validator2, "Validators 2", { from: owner });
    //         await token.transfer(validator2, auditTokenMorMax, { from: owner });
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

    //         await members.addEnterpriseUser(enterprise1, "Enterprise 1", { from: owner });
    //         await token.transfer(enterprise1, auditTokenMin, { from: owner });
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
    //             let result = await members.stake(auditTokenMin, { from: owner });
    //         } catch (error) {
    //             ensureException(error);
    //         }
    //     })
    // })

    // describe("Data subscriber subscribes to cohorts", async () => {

    //     let cohortAddress;

    //     beforeEach(async () => {

    //         await members.addEnterpriseUser(enterprise1, "Enterprise 1", { from: owner });
    //         await members.addValidatorUser(validator1, "Validators 1", { from: owner });
    //         await members.addValidatorUser(validator2, "Validators 2", { from: owner });
    //         await members.addValidatorUser(validator3, "Validators 3", { from: owner });

    //         await token.transfer(validator1, auditTokenMax, { from: owner });
    //         await token.transfer(validator2, auditTokenMin, { from: owner });
    //         await token.transfer(validator3, auditTokenMin, { from: owner });

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
    //         await token.transfer(dataSubscriber, auditTokenMin, { from: owner });
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

    //         await token.transfer(dataSubscriber, auditTokenMin, { from: owner });

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


    // describe("Process daily earnings", async () => {

    //     let cohortAddress;
    //     let cohortContract;

    //     beforeEach(async () => {

    //         await members.addEnterpriseUser(enterprise1, "Enterprise 1", { from: owner });
    //         await members.addValidatorUser(validator1, "Validators 1", { from: owner });
    //         await members.addValidatorUser(validator2, "Validators 2", { from: owner });
    //         await members.addValidatorUser(validator3, "Validators 3", { from: owner });
    //         await members.addValidatorUser(validator4, "Validators 4", { from: owner });


    //         await token.transfer(validator1, auditTokenMin, { from: owner });
    //         await token.transfer(validator2, auditTokenMin, { from: owner });
    //         await token.transfer(validator3, auditTokenMin, { from: owner });
    //         await token.transfer(enterprise1, auditTokenMin, { from: owner });


    //         await token.approve(members.address, auditTokenMin, { from: validator1 });
    //         await token.approve(members.address, auditTokenMin, { from: validator2 });
    //         await token.approve(members.address, auditTokenMin, { from: validator3 });
    //         await token.approve(members.address, auditTokenMin, { from: enterprise1 });


    //         await members.stake(auditTokenMin, { from: validator1 });
    //         await members.stake(auditTokenMin, { from: validator2 });
    //         await members.stake(auditTokenMin, { from: validator3 });
    //         await members.stake(auditTokenMin, { from: enterprise1 });



    //         await cohortFactory.inviteValidator(validator1, 0, { from: enterprise1 });
    //         await cohortFactory.inviteValidator(validator2, 0, { from: enterprise1 });
    //         await cohortFactory.inviteValidator(validator3, 0, { from: enterprise1 });

    //         await cohortFactory.acceptInvitation(enterprise1, 0, { from: validator1 });
    //         await cohortFactory.acceptInvitation(enterprise1, 1, { from: validator2 });
    //         await cohortFactory.acceptInvitation(enterprise1, 2, { from: validator3 });

    //         let result = await cohortFactory.createCohort(0, { from: enterprise1 });
    //         let event = result.logs[1];
    //         cohortAddress = event.args.cohort;

    //         cohortContract = new web3.eth.Contract(Cohort["abi"], cohortAddress);

    //         let documentHash = web3.utils.soliditySha3("2+1=4");
    //         result = await cohortContract.methods.initializeValidation(documentHash).send({ from: enterprise1 });
    //         let validationInitTime = result.events.ValidationInitialized.returnValues.initTime;
    //         // let validationHash = web3.utils.soliditySha3(documentHash, validationInitTime);

    //         await cohortContract.methods.validate(documentHash, validationInitTime, 0).send({ from: validator1, gas: 200000 });
    //         await cohortContract.methods.validate(documentHash, validationInitTime, 0).send({ from: validator2, gas: 200000 });
    //         await cohortContract.methods.validate(documentHash, validationInitTime, 0).send({ from: validator3, gas: 200000 });

    //     })

    //     it("Should succeed. Claim rewards by validator who has earned some funds. ", async () => {

    //         await cohortContract.methods.grantRole(CONTROLLER_ROLE, members.address).send({ from: owner });
            

    //         let balanceBefore = await members.deposits(validator1);
    //         // console.log("balanceBefore" , balanceBefore.toString());

    //         let validatorsToSend = [validator1, validator2, validator3];
    //         let amountsToSend = [rewardTokens, rewardTokens, rewardTokens];
    //         await members.updateDailyEarningsTransferFunds(validatorsToSend, amountsToSend, cohortAddress, { from: owner, gas: 200000 });
    //         let enterpriseMatch = await members.enterpriseMatch();

    //         // console.log("enterpriseMatch" , enterpriseMatch.toString());

    //         let enterprisePortion = new BigNumber (rewardTokens).mult(enterpriseMatch.toString()).div(10000);

    //         // console.log("enterprisePortion" , enterprisePortion.toString());

            
    //         let result = await members.redeem(new BigNumber(rewardTokens).add(enterprisePortion), { from: validator1 });
            
    //         let balanceAfter = await members.deposits(validator1);
    //         // console.log("balanceAfter" , balanceAfter.toString());

    //         let event = result.logs[0];
    //         let amount = event.args.amount;


    //         assert.strictEqual(balanceAfter.toString(), balanceBefore.toString());
    //     })

    //     it("Should fail. Claim rewards by validator who has no funds. ", async () => {

    //         await cohortContract.methods.grantRole(CONTROLLER_ROLE, members.address).send({ from: owner });
    //         await token.grantRole(CONTROLLER_ROLE, members.address, { from: owner });

    //         let balanceBefore = await members.deposits(validator1);

    //         let validatorsToSend = [validator1, validator2];
    //         let amountsToSend = [rewardTokens, rewardTokens];
    //         await members.updateDailyEarningsTransferFunds(validatorsToSend, amountsToSend, cohortAddress, { from: owner, gas: 200000 });

    //         try {
    //             await members.redeem(new BigNumber(rewardTokens), { from: validator4 });
    //         } catch (error) {
    //             ensureException(error);
    //         }
    //         let balanceAfter = await members.deposits(validator1);
    //     })

    //     it("Should succeed. Add daily earnings by validators called by controller. ", async () => {


    //         await token.grantRole(CONTROLLER_ROLE, members.address, { from: owner });
    //         await cohortContract.methods.grantRole(CONTROLLER_ROLE, members.address).send({ from: owner });



    //         let validatorsToSend = [validator1, validator2, validator3];
    //         let amountsToSend = [rewardTokens, rewardTokens, rewardTokens];
    //         let enterpriseBalanceBefore = await members.deposits(enterprise1);
    //         let result = await members.updateDailyEarningsTransferFunds(validatorsToSend, amountsToSend, cohortAddress, { from: owner, gas: 200000 });

    //         // let event = result.logs[0];

    //         // let cohort = event.args.cohort;
    //         // assert.strictEqual(cohort, cohortAddress);

    //         let validator1Balance = await members.deposits(validator1);
    //         let validator2Balance = await members.deposits(validator2);
    //         let validator3Balance = await members.deposits(validator3);
    //         let enterpriseBalanceAfter = await members.deposits(enterprise1);
    //         let platformAccountBalanceAfter = await token.balanceOf(platformAccount);
    //         let platformAccountDiff = new BigNumber(platformAccountBalanceAfter.toString()).subtract(enterpriseBalanceBefore.toString())

    //         // console.log("balance before:" , platformAccountBalanceBefore.toString());
    //         // console.log("balance after: " , platformAccountBalanceAfter.toString());

    //         // console.log("validator1 balance", (validator1Balance - auditTokenMin).toString());
    //         // console.log("validator2 balance", (validator2Balance - auditTokenMin).toString());
    //         // console.log("validator3 balance", (validator3Balance - auditTokenMin).toString());
    //         // console.log("Enterprise balance before", (enterpriseBalanceBefore).toString());
    //         // console.log("Enterprise balance after", (enterpriseBalanceAfter).toString());

    //         const entrepreneurBalanceDiff = new BigNumber(enterpriseBalanceBefore.toString()).subtract(enterpriseBalanceAfter.toString());
    //         const validator1BalanceDiff = new BigNumber(validator1Balance.toString()).subtract(auditTokenMin.toString());
    //         const validator2BalanceDiff = new BigNumber(validator2Balance.toString()).subtract(auditTokenMin.toString());
    //         const validator3BalanceDiff = new BigNumber(validator3Balance.toString()).subtract(auditTokenMin.toString());

    //         const platformRewardExpected = new BigNumber(rewardTokens).mult(3).mult(15).div(85);

    //         let enterpriseMatch = await members.enterpriseMatch();

    //         // console.log("enterpriseMatch" , enterpriseMatch.toString());

    //         let enterprisePortion = new BigNumber (rewardTokens).mult(enterpriseMatch.toString()).div(10000);

    //         // console.log("enterprisePortion", enterprisePortion.toString());

    //         let totalEarnedPerUser = new BigNumber(rewardTokens).add(enterprisePortion).toString();

    //         // console.log("Enterprise balance", entrepreneurBalance.toString());


    //         assert.strictEqual(validator1BalanceDiff.toString(), totalEarnedPerUser);
    //         assert.strictEqual(validator2BalanceDiff.toString(), totalEarnedPerUser);
    //         assert.strictEqual(validator3BalanceDiff.toString(), totalEarnedPerUser);
    //         assert.strictEqual(entrepreneurBalanceDiff.toString(), (enterprisePortion * 3).toString());
    //         assert.strictEqual(platformAccountBalanceAfter.toString(), platformRewardExpected.toString());



    //     })

    //     it("Should fail. Add daily earnings by validators called by random user", async () => {

    //         await token.grantRole(CONTROLLER_ROLE, members.address, { from: owner });
    //         await cohortContract.methods.grantRole(CONTROLLER_ROLE, members.address).send({ from: owner });

    //         let validatorsToSend = [validator1, validator2, validator3];
    //         let amountsToSend = [rewardTokens, rewardTokens, rewardTokens];
    //         let enterpriseBalanceBefore = await members.deposits(enterprise1);

    //         try {
    //             await members.updateDailyEarningsTransferFunds(validatorsToSend, amountsToSend, cohortAddress, { from: validator2, gas: 200000 });
    //         } catch (error) {
    //             ensureException(error);
    //         }
    //     })

    //     it("Should succeed. Enterprise can withdraw funds minus obligation to cover payments since recent update. ", async () => {

    //         let balanceBefore = await members.deposits(enterprise1);
    //         let outstandingValidations = await members.returnOutstandingValidations({ from: enterprise1 });
    //         let amountTokensPerValidation = await members.amountTokensPerValidation();
    //         let enterpriseMatch = await members.enterpriseMatch();


    //         let fundsForOutstandingValidations = new BigNumber (rewardTokens).mult(enterpriseMatch.toString()).div(10000);

    //         let fundsAvailableForWithdrawal = new BigNumber(balanceBefore.toString()).subtract(fundsForOutstandingValidations.toString());
    //         await members.redeem(fundsAvailableForWithdrawal, { from: enterprise1 });

    //         let balanceAfter = await members.deposits(enterprise1);


    //         // console.log("balanceBefore", balanceBefore.toString());
    //         // console.log("balanceAfter", balanceAfter.toString());
    //         // console.log("outstandingValidations", outstandingValidations.toString());
    //         // console.log("fundsForOutstandingValidations", fundsForOutstandingValidations.toString());

    //         assert.strictEqual(balanceAfter.toString(), fundsForOutstandingValidations.toString());

    //     })

    //     it("Should fail. Enterprise withdraws funds above obligation to cover payments since recent update. ", async () => {

    //         let balanceBefore = await members.deposits(enterprise1);

    //         try {
    //             await members.redeem(balanceBefore, { from: enterprise1 });
    //         } catch (error) {
    //             ensureException(error);
    //         }



    //     })
    // })

    describe("Test governance updates", async () => {

        it("It should succeed. Reward per validation was updated by authorized user.", async () => {

            await members.grantRole(SETTER_ROLE, owner, { from: owner });
            await members.updateRewards(auditTokenMin, { from: owner });
            let newReward = await members.amountTokensPerValidation();
            assert.strictEqual(newReward.toString(), auditTokenMin.toString());
        })


        it("It should fail. Reward per validation was updated by unauthorized user.", async () => {

            try {
                await members.updateRewards(auditTokenMin, { from: enterprise1 });
            }
            catch (error) {
                ensureException(error);
            }
        })

        it("It should succeed. updateEnterpriseMatch was updated by authorized user.", async () => {

            await members.grantRole(SETTER_ROLE, owner, { from: owner });
            await members.updateEnterpriseMatch(2340, { from: owner });
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

        it("It should succeed. updateMinDepositDays was updated by authorized user.", async () => {

            await members.grantRole(SETTER_ROLE, owner, { from: owner });
            await members.updateMinDepositDays(39, { from: owner });
            let newMinDays = await members.minDepositDays();
            assert.strictEqual(newMinDays.toString(), "39");
        })


        it("It should fail. updateMinDepositDays was updated by unauthorized user.", async () => {

            try {
                await members.updateMinDepositDays(2340, { from: enterprise1 });
            }
            catch (error) {
                ensureException(error);
            }
        })


        it("It should succeed. setDataSubscriberShares was updated by authorized user.", async () => {

            await members.grantRole(SETTER_ROLE, owner, { from: owner });
            await members.setDataSubscriberShares(45, 40, { from: owner });
            let enterpriseShareSubscriber = await members.enterpriseShareSubscriber();
            let validatorShareSubscriber = await members.validatorShareSubscriber();

            assert.strictEqual(enterpriseShareSubscriber.toString(), "45");
            assert.strictEqual(validatorShareSubscriber.toString(), "40");

        })


        it("It should fail. setDataSubscriberShares was updated by unauthorized user.", async () => {

            try {
                await members.setDataSubscriberShares(1,1 ,{ from: enterprise1 });
            }
            catch (error) {
                ensureException(error);
            }
        })

        it("It should fail. setDataSubscriberShares was updated by authorized user but parameters exceeded allowable values.", async () => {

            try {
                await members.setDataSubscriberShares(55 ,55 ,{ from: enterprise1 });
            }
            catch (error) {
                ensureException(error);
            }
        })


    })


})
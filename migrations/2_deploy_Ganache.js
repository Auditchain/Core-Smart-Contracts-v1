const Members = artifacts.require('./Members.sol');
const Token = artifacts.require('./AuditToken.sol');
const ValidationHelpers = artifacts.require('./ValidationHelpers.sol');
// const ValidationHelpersNoCohort = artifacts.require('./ValidationHelpers.sol');
const Cohort = artifacts.require('./ValidationsCohort.sol');
const NoCohort = artifacts.require('./ValidationsNoCohort.sol');
const CohortFactory = artifacts.require('..build/contracts/CohortFactory.sol');

const GovernorAlpha = artifacts.require('../build/contracts/GovernorAlpha.sol')
const MemberHelpers = artifacts.require('../build/contracts/MemberHelpers.sol');
const DepositModifiers = artifacts.require('../build/contracts/DepositModifiers.sol');
const NFT = artifacts.require('./RulesERC721Token.sol');
const NodeOperations = artifacts.require('./NodeOperations.sol');

const Timelock = artifacts.require('./Governance/Timelock.sol');

const ethers = require('ethers');
const timeMachine = require('ganache-time-traveler');
const abi = new ethers.utils.AbiCoder();
const assert = require('chai');



module.exports = async function (deployer, network, accounts) { // eslint-disable-line..

  let admin = accounts[0];
  // let admin = "0x67794670742BA1E53FD04d8bA22a9b4487CE65B4";

  let delegating = accounts[1];
  let dataSubscriber = accounts[2];
  let dataSubscriber2 = accounts[11];
  let dataSubscriber3 = accounts[12];

  let validator1 = accounts[3];
  let validator2 = accounts[4];
  let validator3 = accounts[5];
  let validator4 = accounts[6];
  let enterprise1 = accounts[7];
  let enterprise2 = accounts[8];
  let platformAddress = accounts[9];
  let validatorAmountMin = "5000000000000000000000";
  let validatorAmountMax = "8000000000000000000000";
  let subscriberFee = "1000000000000000000000";
  let addressZero = "0x0000000000000000000000000000000000000000"

  const tokenAmount1 = "9000000000000000000000000";
  const tokenAmount2 = "8500000000000000000000000";
  const tokenAmount3 = "10000000000000000000000000";
  const tokenAmount4 = "44443332220000000000000000";
  const tokenAmount5 = "14443332220000000000000000";
  const tokenAmount6 = "9000000000000000000000000"



  let CONTROLLER_ROLE = web3.utils.keccak256("CONTROLLER_ROLE");
  let SETTER_ROLE = web3.utils.keccak256("SETTER_ROLE");

  await deployer.deploy(Token, admin);
  let token = await Token.deployed();

  console.log("token address:", token.address);

  await deployer.deploy(Members, platformAddress);
  let members = await Members.deployed();

  
  await deployer.deploy(MemberHelpers, members.address, token.address);
  let memberHelpers = await MemberHelpers.deployed();

  await deployer.deploy(ValidationHelpers, MemberHelpers.address);
  let validationHelpers = await ValidationHelpers.deployed();

  await deployer.deploy(CohortFactory, members.address, memberHelpers.address);
  let cohortFactory = await CohortFactory.deployed();

  await deployer.deploy(NodeOperations, memberHelpers.address, token.address, members.address);
  let nodeOperations = await NodeOperations.deployed();

  await deployer.deploy(DepositModifiers, members.address, token.address, memberHelpers.address, cohortFactory.address, nodeOperations.address);
  let depositModifiers = await DepositModifiers.deployed();

  await deployer.deploy(Cohort, members.address, memberHelpers.address, cohortFactory.address, depositModifiers.address, nodeOperations.address, validationHelpers.address);
  let cohort = await Cohort.deployed();

  await deployer.deploy(NoCohort, members.address, memberHelpers.address, cohortFactory.address, depositModifiers.address, nodeOperations.address, validationHelpers.address);
  let noCohort = await NoCohort.deployed();

  // await validationHelpersCohort.setValidationContract(cohort.address);
  // await validationHelpersNoCohort.setValidationContract(noCohort.address);


  await memberHelpers.grantRole(CONTROLLER_ROLE, admin, { from: admin });
  await memberHelpers.grantRole(CONTROLLER_ROLE, noCohort.address, { from: admin });
  await memberHelpers.grantRole(CONTROLLER_ROLE, depositModifiers.address, { from: admin });
  await memberHelpers.grantRole(CONTROLLER_ROLE, nodeOperations.address, { from: admin });
  await nodeOperations.grantRole(CONTROLLER_ROLE, cohort.address, { from: admin });
  await nodeOperations.grantRole(CONTROLLER_ROLE, noCohort.address, { from: admin });
  await nodeOperations.grantRole(CONTROLLER_ROLE, depositModifiers.address, { from: admin });







  // await memberHelpers.setCohortFactory(cohortFactory.address, { from: admin });


  await members.grantRole(CONTROLLER_ROLE, admin, { from: admin });
  await token.grantRole(CONTROLLER_ROLE, admin, { from: admin });


  await deployer.deploy(Timelock, admin, 5);
  let timelock = await Timelock.deployed();

  await deployer.deploy(GovernorAlpha, timelock.address, token.address, admin);
  let gov = await GovernorAlpha.deployed();




  await deployer.deploy(NFT, "Test", "Test", cohort.address);
  let nft = await NFT.deployed();

  await timelock.setPendingAdmin(gov.address, { from: admin });
  await timelock.acceptAdmin({ from: admin });

  // await members.grantRole(CONTROLLER_ROLE, admin, { from: admin });
  await members.grantRole(CONTROLLER_ROLE, admin, { from: admin });
  // await token.grantRole(CONTROLLER_ROLE, admin, { from: admin });

  await cohortFactory.grantRole(SETTER_ROLE, timelock.address, { from: admin });
  await members.grantRole(SETTER_ROLE, timelock.address, { from: admin });

  await cohortFactory.grantRole(SETTER_ROLE, timelock.address, { from: admin });

  await token.grantRole(CONTROLLER_ROLE, members.address, { from: admin });
  await token.grantRole(CONTROLLER_ROLE, memberHelpers.address, { from: admin });
  await token.grantRole(CONTROLLER_ROLE, nodeOperations.address, { from: admin });


  await depositModifiers.grantRole(CONTROLLER_ROLE, cohort.address, { from: admin });
  await depositModifiers.grantRole(CONTROLLER_ROLE, noCohort.address, { from: admin });





  await members.addUser(enterprise1, "Enterprise 1", 0, { from: admin });
  await members.addUser(enterprise2, "Enterprise 2", 0, { from: admin });

  await members.addUser(validator1, "Validator 1", 1, { from: admin });
  await members.addUser(validator2, "Validator 2", 1, { from: admin });
  await members.addUser(validator3, "Validator 3", 1, { from: admin });
  await members.addUser(validator4, "Validator 4", 1, { from: admin });
  await members.addUser(delegating, "delegating", 1, { from: admin });

  await members.addUser(dataSubscriber, "Datasubscriber 1", 2, { from: admin });
  await members.addUser(dataSubscriber2, "Datasubscriber 2", 2, { from: admin });
  await members.addUser(dataSubscriber3, "Datasubscriber 3", 2, { from: admin });





  await token.transfer(accounts[1], tokenAmount1);
  await token.transfer(accounts[2], tokenAmount2);
  await token.transfer(accounts[3], tokenAmount3);
  await token.transfer(accounts[4], tokenAmount4);
  await token.transfer(accounts[5], tokenAmount5);
  await token.transfer(accounts[6], tokenAmount2);
  await token.transfer(accounts[7], tokenAmount2);
  await token.transfer(accounts[8], tokenAmount3);
  await token.transfer(accounts[11], tokenAmount3);
  await token.transfer(accounts[12], tokenAmount3);

  await token.transfer(delegating, tokenAmount6);





  await token.approve(memberHelpers.address, validatorAmountMax, { from: validator1 });
  await token.approve(memberHelpers.address, validatorAmountMin, { from: validator2 });
  await token.approve(memberHelpers.address, validatorAmountMin, { from: validator3 });
  await token.approve(memberHelpers.address, validatorAmountMin, { from: validator4 });
  await token.approve(memberHelpers.address, validatorAmountMin, { from: enterprise1 });
  await token.approve(memberHelpers.address, validatorAmountMin, { from: enterprise2 });
  await token.approve(memberHelpers.address, validatorAmountMin, { from: dataSubscriber });
  await token.approve(memberHelpers.address, validatorAmountMin, { from: dataSubscriber2 });
  await token.approve(memberHelpers.address, validatorAmountMin, { from: dataSubscriber3 });

  await token.approve(memberHelpers.address, validatorAmountMin, { from: delegating });





  await memberHelpers.stake(validatorAmountMax, { from: validator1 });
  await memberHelpers.stake(validatorAmountMin, { from: validator2 });
  await memberHelpers.stake(validatorAmountMin, { from: validator3 });
  await memberHelpers.stake(validatorAmountMin, { from: validator4 });
  await memberHelpers.stake(validatorAmountMin, { from: enterprise1 });
  await memberHelpers.stake(validatorAmountMin, { from: enterprise2 });
  await memberHelpers.stake(validatorAmountMin, { from: delegating });


  await memberHelpers.stake(validatorAmountMin, { from: dataSubscriber });
  await memberHelpers.stake(validatorAmountMin, { from: dataSubscriber2 });
  await memberHelpers.stake(validatorAmountMin, { from: dataSubscriber3 });


  await nodeOperations.toggleNodeOperator({ from: validator1 });
  await nodeOperations.toggleNodeOperator({ from: validator2 });
  await nodeOperations.toggleNodeOperator({ from: validator3 });
  await nodeOperations.toggleNodeOperator({ from: validator4 });





  await cohortFactory.inviteValidatorMultiple([validator1, validator2, validator3, validator4], 1, { from: enterprise2 });
  await cohortFactory.inviteValidatorMultiple([validator1, validator2, validator3, validator4], 2, { from: enterprise2 });
  await cohortFactory.inviteValidatorMultiple([validator1, validator2, validator3, validator4], 3, { from: enterprise2 });
  await cohortFactory.inviteValidatorMultiple([validator1, validator2, validator3, validator4], 1, { from: enterprise1 });
  await cohortFactory.inviteValidatorMultiple([validator1, validator2, validator3, validator4], 2, { from: enterprise1 });
  await cohortFactory.inviteValidatorMultiple([validator1, validator2, validator3, validator4], 3, { from: enterprise1 });

  await cohortFactory.acceptInvitation(enterprise2, 0, { from: validator1 });
  await cohortFactory.acceptInvitation(enterprise2, 1, { from: validator2 });
  await cohortFactory.acceptInvitation(enterprise2, 2, { from: validator3 });
  await cohortFactory.acceptInvitation(enterprise2, 3, { from: validator4 });

  await cohortFactory.acceptInvitation(enterprise1, 0, { from: validator1 });
  await cohortFactory.acceptInvitation(enterprise1, 1, { from: validator2 });
  await cohortFactory.acceptInvitation(enterprise1, 2, { from: validator3 });
  await cohortFactory.acceptInvitation(enterprise1, 3, { from: validator4 });

  // await cohortFactory.acceptInvitation(enterprise1, 4, { from: validator2 });
  // await cohortFactory.acceptInvitation(enterprise1, 5, { from: validator3 });
  // await cohortFactory.acceptInvitation(enterprise1, 6, { from: validator4 });
  // await cohortFactory.acceptInvitation(enterprise1, 7, { from: validator1 });



  await cohortFactory.acceptInvitation(enterprise1, 8, { from: validator1 });
  await cohortFactory.acceptInvitation(enterprise1, 9, { from: validator2 });
  await cohortFactory.acceptInvitation(enterprise1, 10, { from: validator3 });
  await cohortFactory.acceptInvitation(enterprise1, 11, { from: validator4 });


  let result = await cohortFactory.createCohort(1, { from: enterprise1 });

  let event = result.logs[0];

  await memberHelpers.grantRole(CONTROLLER_ROLE, admin, { from: admin });
  await memberHelpers.grantRole(CONTROLLER_ROLE, cohort.address, { from: admin });

  await token.grantRole(CONTROLLER_ROLE, depositModifiers.address, { from: admin });

  await memberHelpers.setValidation(cohort.address, { from: admin });
  // await memberHelpers.setCohort(cohort.address, { from: admin });

  let documentURL = "http://xbrlsite.azurewebsites.net/2021/reporting-scheme/proof/reference-implementation/instance.xml"
  documentHash = web3.utils.soliditySha3(documentURL);

  result = await cohort.initializeValidationCohort(documentHash, documentURL, 1, { from: enterprise1 });



  event = result.logs[0];
  let validationInitTime = event.args.initTime;
  let user = event.args.user



  await cohort.validate(documentHash, validationInitTime, user, 1, "", documentHash, { from: validator1, gas: 800000 });
  await cohort.validate(documentHash, validationInitTime, user, 1, "", documentHash, { from: validator2, gas: 800000 });
  await cohort.validate(documentHash, validationInitTime, user, 1, "", documentHash, { from: validator3, gas: 800000 });
  await cohort.validate(documentHash, validationInitTime, user, 1, "", documentHash, { from: validator4, gas: 800000 });


  timeMachine.advanceTimeAndBlock(10);

  // await cohortFactory.createCohort(2, { from: enterprise1 });
  result = await cohort.initializeValidationCohort(documentHash, documentURL, 1, { from: enterprise1 });

  event = result.logs[0];
  validationInitTime = event.args.initTime;
  user = event.args.user



  await cohort.validate(documentHash, validationInitTime, user, 1, "", documentHash, { from: validator1, gas: 800000 });
  await cohort.validate(documentHash, validationInitTime, user, 2, "", documentHash, { from: validator2, gas: 800000 });

  await cohort.validate(documentHash, validationInitTime, user, 1, "", documentHash, { from: validator3, gas: 800000 });
  await cohort.validate(documentHash, validationInitTime, user, 1, "", documentHash, { from: validator4, gas: 800000 });


  timeMachine.advanceTimeAndBlock(10);

  // await cohortFactory.createCohort(2, { from: enterprise1 });
  result = await cohort.initializeValidationCohort(documentHash, documentURL, 1, { from: enterprise1 });

  event = result.logs[0];
  validationInitTime = event.args.initTime;
  user = event.args.user


  await cohort.validate(documentHash, validationInitTime, user, 1, "", documentHash, { from: validator1, gas: 800000 });
  await cohort.validate(documentHash, validationInitTime, user, 2, "", documentHash, { from: validator2, gas: 800000 });
  result = await cohort.validate(documentHash, validationInitTime, user, 1, "", documentHash, { from: validator3, gas: 800000 });


  // event = result.logs[0];
  // let event1 = result.logs[1];
  // let event2 = result.logs[2]

  // console.log("event", event.event);
  // console.log("event1", event1.event);
  // console.log("event2", event2.event);



  // validationInitTime = event.args.initTime;


  await cohort.validate(documentHash, validationInitTime, user, 1, "", documentHash, { from: validator4, gas: 800000 });
  await token.approve(depositModifiers.address, subscriberFee, { from: dataSubscriber });
  await depositModifiers.dataSubscriberPayment(enterprise1, 1, { from: dataSubscriber });

  // const isSubscribed = await memberHelpers.dataSubscriberCohortMap(dataSubscriber, enterprise1, audits);



  // ****************NFT***************************************//

  await cohortFactory.createCohort(3, { from: enterprise1 });

  documentURL = "QmNhaANyYwWmfrRBfMbXyogPhBSTQdzFL8TiWbqjBmNuoc/Auditchain.json";

  documentHash = web3.utils.soliditySha3(documentURL);
  result = await cohort.initializeValidationCohort(documentHash, documentURL, 3, { from: enterprise1, gas: 6000000 });

  event = result.logs[0];
  validationInitTime = event.args.initTime;
  user = event.args.user



  await cohort.validate(documentHash, validationInitTime, user, 1, "", documentHash, { from: validator1, gas: 900000 });
  await cohort.validate(documentHash, validationInitTime, user, 1, "", documentHash, { from: validator2, gas: 900000 });
  await cohort.validate(documentHash, validationInitTime, user, 1, "", documentHash, { from: validator3, gas: 900000 });
  await cohort.validate(documentHash, validationInitTime, user, 1, "", documentHash, { from: validator4, gas: 900000 });




  //*****************************************Cohort cases end */

  //*****************************************No Cohort cases start */

  result = await noCohort.initializeValidationNoCohort(documentHash, documentURL, 1, { from: dataSubscriber });
  event = result.logs[0];
  validationInitTime = event.args.initTime;
  user = event.args.user


  await nodeOperations.delegate(validator1, { from: delegating });

  await noCohort.validate(documentHash, validationInitTime, user, 1, "", documentHash, { from: validator1, gas: 800000 });
  await noCohort.validate(documentHash, validationInitTime, user, 2, "", documentHash, { from: validator2, gas: 800000 });
  let resultVal = await noCohort.validate(documentHash, validationInitTime, user, 1, "", documentHash, { from: validator3, gas: 800000 });
  await noCohort.validate(documentHash, validationInitTime, user, 1, "", documentHash, { from: validator4, gas: 800000 });
  // await noCohort.validate(documentHash, validationInitTime, user, 1, { from: delegating, gas: 800000 });


  documentURL = "http://xbrlsite.azurewebsites.net/2021/reporting-scheme/proof/reference-implementation/instance1.xml"
  documentHash = web3.utils.soliditySha3(documentURL);

  result = await noCohort.initializeValidationNoCohort(documentHash, documentURL, 1, { from: dataSubscriber });
  event = result.logs[0];
  validationInitTime = event.args.initTime;
  user = event.args.user

  await noCohort.validate(documentHash, validationInitTime, user, 1, "", documentHash, { from: validator1, gas: 800000 });
  await noCohort.validate(documentHash, validationInitTime, user, 2, "", documentHash, { from: validator2, gas: 800000 });
  await noCohort.validate(documentHash, validationInitTime, user, 1, "", documentHash, { from: validator3, gas: 800000 });
  await noCohort.validate(documentHash, validationInitTime, user, 1, "", documentHash, { from: validator4, gas: 800000 });
  // await noCohort.validate(documentHash, validationInitTime, user, 1, { from: delegating, gas: 800000 });


  // console.log("result:", resultVal);

  const eventsMember = await nodeOperations.getPastEvents(
    "LogReferralStakeRewardsIncreased",
    {
      fromBlock: 0,
      toBlock: "latest",
    }
  )



  // console.log("events", eventsMember)


  // let stakingRewards = await nodeOperations.stakeAmount(validator1);

  // console.log("staking rewards:", stakingRewards.toString());


  // await nodeOperations.toggleNodeOperator({ from: validator1 });

  // await nodeOperations.delegate(validator1, { from: validator3 });

  let list = await nodeOperations.returnPoolList(validator1);

  // console.log("Pool list:", list);

  // await memberHelpers.toggleNodeOperator({from:validator1});




  //*****************************************No Cohort cases end */





  // // Governance data
  // await token.delegate(accounts[1], { from: accounts[1] });
  // await token.delegate(accounts[2], { from: accounts[2] });
  // await token.delegate(accounts[4], { from: accounts[4] });
  // await token.delegate(accounts[3], { from: accounts[3] });
  // await token.delegate(accounts[4], { from: accounts[5] });
  // await token.delegate(accounts[1], { from: accounts[0] });
  // await token.delegate(accounts[6], { from: accounts[6] });
  // await token.delegate(accounts[7], { from: accounts[7] });
  // await token.delegate(accounts[8], { from: accounts[8] });

  // values = ["0"];
  // signatures = ["getBalanceOf(address)", "approve(address)"];

  // let description1 = "# Changing SAI collateral factor to 55%\n" +
  //   "First proposal that intent to slowly close the SAI market.\n" +
  //   "The [first](https://compound.finance/governance/proposals/3) proposal in this topic has been successfully executed, continuing with recent analysis of accounts.\n" +
  //   "**Collateral Factor**\n" +
  //   "Going from 65% to 55% with the current market prices **would cause** two liquidations on the analyzed accounts.\n" +
  //   "![Analysis](https://i.imgur.com/KIuG5E2.png)\n" +
  //   "(The list does not contain accounts that hold less than 50 SAI)\n" +
  //   "[Analyzed accounts](https://i.imgur.com/KIuG5E2.png)\n" +
  //   "[Forum discussion!](https://compound.comradery.io/post/1600)\n"

  // let description2 = "# Adjusting Reserve Factors%\n" +
  //   "Second proposal that intent to slowly close the SAI market.\n"

  // let description3 = "# Uniswap Improvement Strategy\n" +
  //   "Third proposal that intent to slowly close the SAI market.\n"


  // let description4 = "# Upgrade cUSDT Interest Rate Model\n" +
  //   "Recently, Dharma led the community to release a new upgradable\n" +
  //   "interest rate model contract for cDAI based on the new JumpRateModelV2.\n" +
  //   "This proposal updates the cUSDT interest rate model to a recently deployed\n" +
  //   "JumpRateModelV2 with the same parameters as the current cDAI interest rate model:\n"

  // // let calldata = [abi.encode(['address', 'uint256'], [accounts[0], 2]), abi.encode(['address', 'uint256'], [accounts[1], 2])];
  // let calldata = [abi.encode(['uint256', 'uint256'], [(5e18).toString(), 0])];

  // let signature = ['updateMinValidatorsPerCohort(uint256,uint256)'];

  // result = await gov.propose([cohortFactory.address], values, signature, calldata, description1, { from: accounts[2] });

  // let test = await gov.getPastEvents('ProposalCreated');

  // event = result.logs[0];


  // values = ["0", "0"];
  // calldata = [abi.encode(['address', 'uint256'], [accounts[0], 2]), abi.encode(['address', 'uint256'], [accounts[1], 2])];
  // result = await gov.propose([accounts[1], accounts[3]], values, signatures, calldata, description2, { from: accounts[1] });

  // result = await gov.propose([accounts[4], accounts[5]], values, signatures, calldata, description3, { from: accounts[4] });

  // result = await gov.castVote(1, 1, { from: accounts[1] });

  // await gov.castVote(1, 1, { from: accounts[2] });
  // await gov.castVote(1, 1, { from: accounts[3] });
  // await gov.castVote(1, 1, { from: accounts[4] });
  // await gov.castVote(1, 1, { from: accounts[6] });
  // await gov.castVote(1, 1, { from: accounts[7] });



  // let receipt = await gov.getReceipt(1, accounts[1]);
  // blockNumber = await web3.eth.getBlockNumber();

  // let state = await gov.state(1)

  // console.log("state before:", state.toString());

  // for (x = 1; x <= 300; ++x) {
  //   timeMachine.advanceBlock();
  // }

  // blockNumber = await web3.eth.getBlockNumber();
  // console.log("block Number after:" + blockNumber);
  // state = await gov.state(1)
  // console.log("state after:", state.toString());
  // await gov.queue(1, { from: accounts[0] });
  // timeMachine.advanceTimeAndBlock(60 * 60 * 6);
  // await gov.execute(1, { from: accounts[0] });
  // blockNumber = await web3.eth.getBlockNumber();



  // let newUpdateRewards = await members.amountTokensPerValidation();

  // console.log("updateRewards", newUpdateRewards.toString());

  // values = ["0", "0"];
  // calldata = [abi.encode(['address', 'uint256'], [accounts[0], 2]), abi.encode(['address', 'uint256'], [accounts[1], 2])];

  // calldata = [abi.encode(['address', 'uint256'], [accounts[0], 2]), abi.encode(['address', 'uint256'], [accounts[1], 2])];
  // result = await gov.propose([accounts[3], accounts[1]], values, signatures, calldata, description4, { from: accounts[3] });
  // event = result.logs[0];

  // // state = await gov.state(4);
  // //  console.log("state:" + state);

  // timeMachine.advanceBlock();

  // await gov.castVote(4, 0, { from: accounts[1] });
  // await gov.castVote(4, 0, { from: accounts[2] });
  // await gov.castVote(4, 1, { from: accounts[3] });
  // await gov.castVote(4, 1, { from: accounts[4] });
  // await gov.castVote(4, 1, { from: accounts[6] });
  // await gov.castVote(4, 0, { from: accounts[7] });


  // await gov.cancel(2, { from: accounts[0] });

  // result = await gov.propose([accounts[1], accounts[2]], values, signatures, calldata, "Test to cancel", { from: accounts[1] });
  // await gov.cancel(5, { from: accounts[0] });


  // front format

  console.log("\n\n Front (Bogdan's testing suit) format" + "\n\n");

  console.log("\n\n" + '"AUDT_TOKEN_ADDRESS":"' + token.address + '",');
  console.log('"MEMBERS_ADDRESS":"' + members.address + '",');
  console.log('"MEMBER_HELPERS_ADDRESS":"' + memberHelpers.address + '",');
  console.log('"DEPOSIT_MODIFIERS_ADDRESS":"' + depositModifiers.address + '",');
  console.log('"COHORT_FACTORY_ADDRESS":"' + cohortFactory.address + '",');
  console.log('"VALIDATIONS_COHORT_ADDRESS":"' + cohort.address + '",');
  console.log('"VALIDATIONS_NO_COHORT_ADDRESS":"' + noCohort.address + '",');
  console.log('"NODE_OPERATIONS_ADDRESS":"' + nodeOperations.address + '",');
  console.log('"GOVERNOR_ALPHA_ADDRESS":"' + gov.address + '",');
  console.log('"TIMELOCK_ADDRESS":"' + timelock.address + '",');
  console.log('"NFT":"' + nft.address + '"' + "\n\n");

  // env format
  console.log("\n\n" + ".env format" + "\n\n");


  console.log('AUDT_TOKEN_ADDRESS=' + token.address);
  console.log('MEMBER_ADDRESS=' + members.address);
  console.log('MEMBER_HELPERS_ADDRESS=' + memberHelpers.address);
  console.log('DEPOSIT_MODIFIERS_ADDRESS=' + depositModifiers.address);
  console.log('COHORT_FACTORY_ADDRESS=' + cohortFactory.address);
  console.log('VALIDATIONS_HELPERS_ADDRESS=' + validationHelpers.address);
  console.log('VALIDATIONS_COHORT_ADDRESS=' + cohort.address);
  console.log('VALIDATIONS_NO_COHORT_ADDRESS=' + noCohort.address);
  console.log('NODE_OPERATIONS_ADDRESS=' + nodeOperations.address);
  console.log('GOVERNOR_ALPHA_ADDRESS=' + gov.address);
  console.log('TIMELOCK_ADDRESS=' + timelock.address);
  console.log('RULES_NFT_ADDRESS=' + nft.address);


  console.log("\n\n" + "React format:" + "\n\n");


  console.log("\n\n" + '"AUDT_TOKEN_ADDRESS":"' + token.address + '",');
  console.log('"MEMBER_ADDRESS":"' + members.address + '",');
  console.log('"MEMBER_HELPERS_ADDRESS":"' + memberHelpers.address + '",');
  console.log('"DEPOSIT_MODIFIERS_ADDRESS":"' + depositModifiers.address + '",');
  console.log('"COHORT_FACTORY_ADDRESS":"' + cohortFactory.address + '",');
  console.log('"VALIDATIONS_HELPERS_ADDRESS":"' + validationHelpers.address + '",');
  console.log('"VALIDATIONS_COHORT_ADDRESS":"' + cohort.address + '",');
  console.log('"VALIDATIONS_NO_COHORT_ADDRESS":"' + noCohort.address + '",')
  console.log('"NODE_OPERATIONS_ADDRESS":"' + nodeOperations.address + '",');
  console.log('"GOVERNOR_ALPHA_ADDRESS":"' + gov.address + '",');
  console.log('"TIMELOCK_ADDRESS":"' + timelock.address + '",');
  console.log('"RULES_NFT_ADDRESS":"' + nft.address + '",' + "\n\n");




};
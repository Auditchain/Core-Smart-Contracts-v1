const Members = artifacts.require('./Members.sol');
const Token = artifacts.require('./AuditToken.sol');
const Cohort = artifacts.require('./ValidationsCohort.sol');
const NoCohort = artifacts.require('./ValidationsNoCohort.sol');
const CohortFactory = artifacts.require('..build/contracts/CohortFactory.sol');

const ValidationHelpers = artifacts.require('./ValidationHelpers.sol');

const GovernorAlpha = artifacts.require('../build/contracts/GovernorAlpha.sol')
const MemberHelpers = artifacts.require('../build/contracts/MemberHelpers.sol');
const DepositModifiers = artifacts.require('../build/contracts/DepositModifiers.sol');
const NFT = artifacts.require('./RulesERC721Token.sol');
const NodeOperations = artifacts.require('./NodeOperations.sol');
const Queue = artifacts.require("./Queue.sol");

const Timelock = artifacts.require('./Governance/Timelock.sol');

const ethers = require('ethers');
const timeMachine = require('ganache-time-traveler');
const abi = new ethers.utils.AbiCoder();
const assert = require('chai');



module.exports = async function (deployer, network, accounts) { // eslint-disable-line..

  let admin = accounts[0];   // 0


  let platformAddress = "0x4311eD2826C3D4E7c82149fAAEe9FB7f40e05568"; // 1

  let dataSubscriber1 = "0xd431134b507d3B6F2742687e14cD9CbA5b6BE0F4"; // 2

  let dataSubscriber2 = "0x9A1A226Be56E93Ec089b3F35500B9192e1B8F859"; // 11
  let dataSubscriber3 = "0xf7Aba62b254d1acCdAA746Af47F92cb9F45D8713"; // 12
  let dataSubscriber4 = "0x4afd87F1f8141D7D35C8c4d04695cf5A5eC62A56"; // 13
  let dataSubscriber5 = "0xd9689B5f12E166330caff10caD68C9CA1bE9F0c0"; // 14
  let dataSubscriber6 = "0x6789544650c40bcC5CDec94f5eccF2BB4567d698"; // 15
  let dataSubscriber7 = "0x52726022ce203E7F5e27A3Bed656198701395249"; // 16
  let dataSubscriber8 = "0x9B312dD101aB2F3A34fBbb68fFee00000a6ac7dc"; // 17
  let dataSubscriber9 = "0x8a08055CB518C8269cE33DDCb397Db2D8FAB7B6E"; // 18
  let dataSubscriber10 = "0xf62Fe4550241B9eEf98DC4249a68269130eAb1b4"; // 19
  let dataSubscriber11 = "0xd0EA6F791aC7a0bbfeE01Dd047b0dB656722e5cb"; //20

  let validator1 = "0x5A8bbBdE5bF85Ba241641403001eef87D90087f6"; // 3
  let validator2 = "0x162e952B2F0363613F905abC8c93B519e670Fa4f"; // 4
  let validator3 = "0x06997173F50DDD017a5f0A87480Ed7220039B46e"; // 5
  let validator4 = "0x79b39D5893382ee75e101bFC9c79708ADD480370"; // 6


  let validator5 = "0xd3956b952a78C7E6C700883924D52CC776F9E4F2"; // 7
  let validator6 = "0x2e5dCB0bdC76d25f8D8349C88e87B44F467171c7"; // 8
  let validator7 = "0xc18251F427C6971FE4da9C05EAf56Db78c7aC0a9"; // 21
  let validator8 = "0x2f17686D0558733eBba0f6c020bDa44D4229625A"; // 22
  let validator9 = "0x327abA0756949C049c0A4dbc490e69142608405D"; // 23
  let validator10 = "0xC22ca6121Ad652B1a5F82abAC5491A45ADB25740"; // 24
  let validator11 = "0x1A966d59690aB3FC1de4b0bE08242Ff29A6F03Fd"; // 25
  let validator12 = "0x6c65db9D7a40b3caeb3AD92AED9c9D89C480D194"; // 26

  let validator13 = "0x069dcE9e6C1e34bdd18Aa7A3a13cbE2274b6601F"; // 27
  let validator14 = "0x9596a77DA1d79Cde87E1a499188E1dA8e5A4Fc20"; // 28
  let validator15 = "0xc439417449a0F05dc45dB2fA8f76571169Fb7E75"; // 29
  let validator16 = "0xC56793118415Cf8E900195eFd584A0364e0429b4"; // 30




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


  const validatorTokenAmount = "25000000000000000000000"



  let CONTROLLER_ROLE = web3.utils.keccak256("CONTROLLER_ROLE");
  let SETTER_ROLE = web3.utils.keccak256("SETTER_ROLE");

  await deployer.deploy(Token, admin);
  let token = await Token.deployed();

  console.log("token address:", token.address);

  await deployer.deploy(Queue);
  let queue = await Queue.deployed();

  // await deployer.deploy(Members, token.address, platformAddress);
  await deployer.deploy(Members, platformAddress);
  let members = await Members.deployed();



  await deployer.deploy(MemberHelpers, members.address, token.address);
  let memberHelpers = await MemberHelpers.deployed();

  await deployer.deploy(CohortFactory, members.address, memberHelpers.address);
  let cohortFactory = await CohortFactory.deployed();

  await deployer.deploy(NodeOperations, memberHelpers.address, token.address, members.address);
  let nodeOperations = await NodeOperations.deployed();

  await deployer.deploy(ValidationHelpers, MemberHelpers.address);
  let validationHelpers = await ValidationHelpers.deployed();


  await deployer.deploy(DepositModifiers, members.address, token.address, memberHelpers.address, cohortFactory.address, nodeOperations.address);
  let depositModifiers = await DepositModifiers.deployed();




  await deployer.deploy(Cohort, members.address, memberHelpers.address, cohortFactory.address, depositModifiers.address, nodeOperations.address, validationHelpers.address, queue.address);
  let cohort = await Cohort.deployed();

  await deployer.deploy(NoCohort, members.address, memberHelpers.address, cohortFactory.address, depositModifiers.address, nodeOperations.address, validationHelpers.address, queue.address);
  let noCohort = await NoCohort.deployed();


  // await deployer.deploy(Timelock, admin, 5);
  // let timelock = await Timelock.deployed();

  // await deployer.deploy(GovernorAlpha, timelock.address, token.address, admin);
  // let gov = await GovernorAlpha.deployed();

  // await deployer.deploy(NFT, "AuditChain", "Rules", cohort.address);
  // let nft = await NFT.deployed();




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
  console.log('QUEUE_ADDRESS=' + queue.address);
  // console.log('GOVERNOR_ALPHA_ADDRESS=' + gov.address);
  // console.log('TIMELOCK_ADDRESS=' + timelock.address);
  // console.log('RULES_NFT_ADDRESS=' + nft.address);


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
  console.log('"QUEUE_ADDRESS":"' + queue.address + '",');
  // console.log('"GOVERNOR_ALPHA_ADDRESS":"' + gov.address + '",');
  // console.log('"TIMELOCK_ADDRESS":"' + timelock.address + '",');
  // console.log('"RULES_NFT_ADDRESS":"' + nft.address + '",' + "\n\n");


  // await timelock.setPendingAdmin(gov.address, { from: admin });
  // console.log('timelock.setPendingAdmin(gov.address, { from: admin })');

  // await timelock.acceptAdmin({ from: admin });
  // console.log("timelock.acceptAdmin({ from: admin })");




  await memberHelpers.grantRole(CONTROLLER_ROLE, admin, { from: admin });
  console.log("memberHelpers.grantRole(CONTROLLER_ROLE, admin, { from: admin })")


  await memberHelpers.grantRole(CONTROLLER_ROLE, noCohort.address, { from: admin });
  console.log('memberHelpers.grantRole(CONTROLLER_ROLE, noCohort.address, { from: admin })')

  await memberHelpers.grantRole(CONTROLLER_ROLE, depositModifiers.address, { from: admin });
  console.log('memberHelpers.grantRole(CONTROLLER_ROLE, depositModifiers.address, { from: admin })')


  await memberHelpers.grantRole(CONTROLLER_ROLE, nodeOperations.address, { from: admin });
  console.log('memberHelpers.grantRole(CONTROLLER_ROLE, nodeOperations.address, { from: admin })');

  await memberHelpers.grantRole(CONTROLLER_ROLE, cohort.address, { from: admin });
  console.log('memberHelpers.grantRole(CONTROLLER_ROLE, cohort.address, { from: admin })')


  await nodeOperations.grantRole(CONTROLLER_ROLE, cohort.address, { from: admin });
  console.log('nodeOperations.grantRole(CONTROLLER_ROLE, cohort.address, { from: admin });')

  await nodeOperations.grantRole(CONTROLLER_ROLE, noCohort.address, { from: admin });
  console.log('nodeOperations.grantRole(CONTROLLER_ROLE, noCohort.address, { from: admin });')

  await nodeOperations.grantRole(CONTROLLER_ROLE, depositModifiers.address, { from: admin });
  console.log('nodeOperations.grantRole(CONTROLLER_ROLE, depositModifiers.address, { from: admin });')

  await members.grantRole(CONTROLLER_ROLE, admin, { from: admin });
  console.log('members.grantRole(CONTROLLER_ROLE, admin, { from: admin });');


  // await members.grantRole(SETTER_ROLE, timelock.address, { from: admin });
  // console.log('members.grantRole(SETTER_ROLE, timelock.address, { from: admin });');

  // await cohortFactory.grantRole(SETTER_ROLE, timelock.address, { from: admin });
  // console.log('cohortFactory.grantRole(SETTER_ROLE, timelock.address, { from: admin });');

  // await nodeOperations.grantRole(SETTER_ROLE, timelock.address, { from: admin });
  // console.log('nodeOperations.grantRole(SETTER_ROLE, timelock.address, { from: admin });');



  await token.grantRole(CONTROLLER_ROLE, admin, { from: admin });
  console.log('token.grantRole(CONTROLLER_ROLE, admin, { from: admin });')

  await token.grantRole(CONTROLLER_ROLE, members.address, { from: admin });
  console.log('token.grantRole(CONTROLLER_ROLE, members.address, { from: admin });');

  await token.grantRole(CONTROLLER_ROLE, memberHelpers.address, { from: admin });
  console.log('token.grantRole(CONTROLLER_ROLE, memberHelpers.address, { from: admin });')


  await token.grantRole(CONTROLLER_ROLE, nodeOperations.address, { from: admin });
  console.log('token.grantRole(CONTROLLER_ROLE, nodeOperations.address, { from: admin });');

  await token.grantRole(CONTROLLER_ROLE, depositModifiers.address, { from: admin });
  console.log('token.grantRole(CONTROLLER_ROLE, depositModifiers.address, { from: admin });')


  await depositModifiers.grantRole(CONTROLLER_ROLE, cohort.address, { from: admin });
  console.log('depositModifiers.grantRole(CONTROLLER_ROLE, cohort.address, { from: admin });');

  await depositModifiers.grantRole(CONTROLLER_ROLE, noCohort.address, { from: admin });
  console.log('epositModifiers.grantRole(CONTROLLER_ROLE, noCohort.address, { from: admin });');

  await memberHelpers.setValidation(cohort.address, { from: admin });
  console.log('memberHelpers.setValidation(cohort.address, { from: admin });')





  await members.addUser(validator1, "Validator 1", 1, { from: admin });
  console.log('members.addUser(validator1, "Validator 1", 1, { from: admin });');

  await await members.addUser(validator2, "Validator 2", 1, { from: admin });
  console.log('await members.addUser(validator2, "Validator 2", 1, { from: admin });');

  await members.addUser(validator3, "Validator 3", 1, { from: admin });
  console.log('await members.addUser(validator3, "Validator 3", 1, { from: admin });');

  // await members.addUser(validator4, "Validator 4", 1, { from: admin });
  // console.log('await members.addUser(validator4, "Validator 4", 1, { from: admin });');



  // await members.addUser(validator5, "Validator 5", 1, { from: admin });
  // console.log('await members.addUser(validator5, "Validator 5", 1, { from: admin });');

  // await members.addUser(validator6, "Validator 6", 1, { from: admin });
  // console.log('await members.addUser(validator6, "Validator 6", 1, { from: admin });');

  // await members.addUser(validator7, "Validator 7", 1, { from: admin });
  // console.log('await members.addUser(validator7, "Validator 7", 1, { from: admin });');

  // await members.addUser(validator8, "Validator 8", 1, { from: admin });
  // console.log('await members.addUser(validator8, "Validator 8", 1, { from: admin });');




  // await members.addUser(validator9, "Validator 9", 1, { from: admin });
  // console.log('await members.addUser(validator9, "Validator 9", 1, { from: admin });');

  // await members.addUser(validator10, "Validator 10", 1, { from: admin });
  // console.log('await members.addUser(validator10, "Validator 10", 1, { from: admin });');

  // await members.addUser(validator11, "Validator 11", 1, { from: admin });
  // console.log('await members.addUser(validator11, "Validator 11", 1, { from: admin });');

  // await members.addUser(validator12, "Validator 12", 1, { from: admin });
  // console.log('await members.addUser(validator12, "Validator 12", 1, { from: admin });');


  // await members.addUser(validator13, "Validator 13", 1, { from: admin });
  // console.log('await members.addUser(validator13, "Validator 13", 1, { from: admin });');

  // await members.addUser(validator14, "Validator 14", 1, { from: admin });
  // console.log('await members.addUser(validator14, "Validator 14", 1, { from: admin });');

  // await members.addUser(validator15, "Validator 15", 1, { from: admin });
  // console.log('await members.addUser(validator15, "Validator 15", 1, { from: admin });');

  // await members.addUser(validator16, "Validator 16", 1, { from: admin });
  // console.log('await members.addUser(validator16, "Validator 16", 1, { from: admin });');



  await members.addUser(dataSubscriber1, "Datasubscriber 1", 2, { from: admin });
  console.log('await members.addUser(dataSubscriber1, "Datasubscriber 1", 2, { from: admin });');

  // await members.addUser(dataSubscriber2, "Datasubscriber 2", 2, { from: admin });
  // console.log('await members.addUser(dataSubscriber2, "Datasubscriber 2", 2, { from: admin });');

  // await members.addUser(dataSubscriber3, "Datasubscriber 3", 2, { from: admin });
  // console.log('await members.addUser(dataSubscriber3, "Datasubscriber 3", 2, { from: admin });');

  // await members.addUser(dataSubscriber4, "Datasubscriber 4", 2, { from: admin });
  // console.log('await members.addUser(dataSubscriber4, "Datasubscriber 4", 2, { from: admin });');


  // await members.addUser(dataSubscriber5, "Datasubscriber 5", 2, { from: admin });
  // console.log('await members.addUser(dataSubscriber5, "Datasubscriber 5", 2, { from: admin });');

  // await members.addUser(dataSubscriber6, "Datasubscriber 6", 2, { from: admin });
  // console.log('await members.addUser(dataSubscriber6, "Datasubscriber 6", 2, { from: admin });');

  // await members.addUser(dataSubscriber7, "Datasubscriber 7", 2, { from: admin });
  // console.log('await members.addUser(dataSubscriber7, "Datasubscriber 7", 2, { from: admin });');

  // await members.addUser(dataSubscriber8, "Datasubscriber 8", 2, { from: admin });
  // console.log('await members.addUser(dataSubscriber8, "Datasubscriber 8", 2, { from: admin });');


  // await members.addUser(dataSubscriber9, "Datasubscriber 9", 2, { from: admin });
  // console.log('await members.addUser(dataSubscriber9, "Datasubscriber 9", 2, { from: admin });');

  // await members.addUser(dataSubscriber10, "Datasubscriber 10", 2, { from: admin });
  // console.log('await members.addUser(dataSubscriber10, "Datasubscriber 10", 2, { from: admin });');

  // await members.addUser(dataSubscriber11, "Datasubscriber 11", 2, { from: admin });
  // console.log('await members.addUser(dataSubscriber11, "Datasubscriber 11", 2, { from: admin });');




  await token.transfer(dataSubscriber1, validatorTokenAmount, { from: admin });
  // await token.transfer(dataSubscriber2, validatorTokenAmount, { from: admin });
  // await token.transfer(dataSubscriber3, validatorTokenAmount, { from: admin });
  // await token.transfer(dataSubscriber4, validatorTokenAmount, { from: admin });
  // await token.transfer(dataSubscriber5, validatorTokenAmount, { from: admin });
  // await token.transfer(dataSubscriber6, validatorTokenAmount, { from: admin });
  // await token.transfer(dataSubscriber7, validatorTokenAmount, { from: admin });
  // await token.transfer(dataSubscriber8, validatorTokenAmount, { from: admin });
  // await token.transfer(dataSubscriber9, validatorTokenAmount, { from: admin });
  // await token.transfer(dataSubscriber10, validatorTokenAmount, { from: admin });
  // await token.transfer(dataSubscriber11, validatorTokenAmount, { from: admin });


  await token.transfer(validator1, validatorTokenAmount, { from: admin });
  await token.transfer(validator2, validatorTokenAmount, { from: admin });
  await token.transfer(validator3, validatorTokenAmount, { from: admin });
  // await token.transfer(validator4, validatorTokenAmount, { from: admin });
  // await token.transfer(validator5, validatorTokenAmount, { from: admin });
  // await token.transfer(validator6, validatorTokenAmount, { from: admin });
  // await token.transfer(validator7, validatorTokenAmount, { from: admin });
  // await token.transfer(validator8, validatorTokenAmount, { from: admin });


  // await token.transfer(validator9, validatorTokenAmount, { from: admin });
  // await token.transfer(validator10, validatorTokenAmount, { from: admin });
  // await token.transfer(validator11, validatorTokenAmount, { from: admin });
  // await token.transfer(validator12, validatorTokenAmount, { from: admin });
  // await token.transfer(validator13, validatorTokenAmount, { from: admin });
  // await token.transfer(validator14, validatorTokenAmount, { from: admin });
  // await token.transfer(validator15, validatorTokenAmount, { from: admin });
  // await token.transfer(validator16, validatorTokenAmount, { from: admin });

  await token.approve(MemberHelpers.address, "24000000000000000000000", {from:  validator1});
  await memberHelpers.stake("24000000000000000000000", {from:validator1});


  await token.approve(MemberHelpers.address, "24000000000000000000000", {from:  validator2});
  await memberHelpers.stake("24000000000000000000000", {from:validator2});

  await token.approve(MemberHelpers.address, "24000000000000000000000", {from:  validator3});
  await memberHelpers.stake("24000000000000000000000", {from:validator3});

  await token.approve(MemberHelpers.address, "24000000000000000000000", {from:  dataSubscriber1});
  await memberHelpers.stake("24000000000000000000000", {from:dataSubscriber1});


  await nodeOperations.toggleNodeOperator({from:  validator1});
  await nodeOperations.toggleNodeOperator({from:  validator2});
  await nodeOperations.toggleNodeOperator({from:  validator3});


  // await token.approve(memberHelpers.address, validatorTokenAmount, {from:validator1} );
  // await memberHelpers.stake(validatorTokenAmount, {from:validator1});

  console.log("FINISHED");







};
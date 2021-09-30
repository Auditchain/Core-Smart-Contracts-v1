const Members = artifacts.require('./Members.sol');
const Token = artifacts.require('./AuditToken.sol');
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

  let delegating = "0x4311eD2826C3D4E7c82149fAAEe9FB7f40e05568";
  let dataSubscriber = "0xd431134b507d3B6F2742687e14cD9CbA5b6BE0F4";
  let validator1 = "0x5A8bbBdE5bF85Ba241641403001eef87D90087f6";
  let validator2 = "0x162e952B2F0363613F905abC8c93B519e670Fa4f";
  let validator3 = "0x06997173F50DDD017a5f0A87480Ed7220039B46e";
  let validator4 = "0x79b39D5893382ee75e101bFC9c79708ADD480370";
  let enterprise1 = "0xd3956b952a78C7E6C700883924D52CC776F9E4F2";
  let enterprise2 = "0x2e5dCB0bdC76d25f8D8349C88e87B44F467171c7";
  let platformAddress = "0xB96C9E9e6A3042d107402cc88c73Bf501aacd49d";
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

  // await deployer.deploy(Members, token.address, platformAddress);
  await deployer.deploy(Members, platformAddress);
  let members = await Members.deployed();

  await deployer.deploy(MemberHelpers, members.address, token.address);
  let memberHelpers = await MemberHelpers.deployed();

  await deployer.deploy(CohortFactory, members.address, memberHelpers.address);
  let cohortFactory = await CohortFactory.deployed();

  await deployer.deploy(NodeOperations, memberHelpers.address, token.address, members.address);
  let nodeOperations = await NodeOperations.deployed();


  await deployer.deploy(DepositModifiers, members.address, token.address, memberHelpers.address, cohortFactory.address, nodeOperations.address);
  let depositModifiers = await DepositModifiers.deployed();




  await deployer.deploy(Cohort, members.address, memberHelpers.address, cohortFactory.address, depositModifiers.address, nodeOperations.address);
  let cohort = await Cohort.deployed();

  await deployer.deploy(NoCohort, members.address, memberHelpers.address, cohortFactory.address, depositModifiers.address, nodeOperations.address);
  let noCohort = await NoCohort.deployed();


  await deployer.deploy(Timelock, admin, 5);
  let timelock = await Timelock.deployed();
  
  await deployer.deploy(GovernorAlpha, timelock.address, token.address, admin);
  let gov = await GovernorAlpha.deployed();

  await deployer.deploy(NFT, "AuditChain", "Rules", cohort.address);
  let nft = await NFT.deployed();



  


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
  console.log('VALIDATIONS_COHORT_ADDRESS=' + cohort.address);
  console.log('VALIDATIONS_NO_COHORT_ADDRESS=' + noCohort.address);
  console.log('NODE_OPERATIONS_ADDRESS=' + nodeOperations.address);
  console.log('GOVERNOR_ALPHA_ADDRESS=' + gov.address);
  console.log('TIMELOCK_ADDRESS=' + timelock.address);
  console.log('RULES_NFT_ADDRESS=' + nft.address);


  console.log("\n\n" + "React format:" + "\n\n");


  console.log("\n\n" + 'audtTokenAddress:"' + token.address + '",');
  console.log('membersAddress:"' + members.address + '",');
  console.log('memberHelpersAddress:"' + memberHelpers.address + '",');
  console.log('depositModifiersAddress:"' + depositModifiers.address + '",');
  console.log('cohortFactoryAddress:"' + cohortFactory.address + '",');
  console.log('validationsCohortAddress:"' + cohort.address + '",');
  console.log('validationsNoCohortAddress:"' + noCohort.address + '",')
  console.log('nodeOperationsAddress:"' + nodeOperations.address + '",');
  console.log('governorAlphaAddress:"' + gov.address + '",');
  console.log('timelockAddress:"' + timelock.address + '",');
  console.log('rulesNFTAddress:"' + nft.address + '",' + "\n\n");


  

  await timelock.setPendingAdmin(gov.address, { from: admin });
  console.log('timelock.setPendingAdmin(gov.address, { from: admin })');

  await timelock.acceptAdmin({ from: admin });
  console.log("timelock.acceptAdmin({ from: admin })");

  


  memberHelpers.grantRole(CONTROLLER_ROLE, admin, { from: admin });
  console.log("memberHelpers.grantRole(CONTROLLER_ROLE, admin, { from: admin })")


  memberHelpers.grantRole(CONTROLLER_ROLE, noCohort.address, { from: admin });
  console.log('memberHelpers.grantRole(CONTROLLER_ROLE, noCohort.address, { from: admin })')

  memberHelpers.grantRole(CONTROLLER_ROLE, depositModifiers.address, { from: admin });
  console.log('memberHelpers.grantRole(CONTROLLER_ROLE, depositModifiers.address, { from: admin })')


  memberHelpers.grantRole(CONTROLLER_ROLE, nodeOperations.address, { from: admin });
  console.log('memberHelpers.grantRole(CONTROLLER_ROLE, nodeOperations.address, { from: admin })');

  memberHelpers.grantRole(CONTROLLER_ROLE, cohort.address, { from: admin });
  console.log('memberHelpers.grantRole(CONTROLLER_ROLE, cohort.address, { from: admin })')

  
  nodeOperations.grantRole(CONTROLLER_ROLE, cohort.address, { from: admin }); 
  console.log('nodeOperations.grantRole(CONTROLLER_ROLE, cohort.address, { from: admin });')

  nodeOperations.grantRole(CONTROLLER_ROLE, noCohort.address, { from: admin });
  console.log('nodeOperations.grantRole(CONTROLLER_ROLE, noCohort.address, { from: admin });')

  nodeOperations.grantRole(CONTROLLER_ROLE, depositModifiers.address, { from: admin });
  console.log('nodeOperations.grantRole(CONTROLLER_ROLE, depositModifiers.address, { from: admin });')
  
  members.grantRole(CONTROLLER_ROLE, admin, { from: admin });
  console.log('members.grantRole(CONTROLLER_ROLE, admin, { from: admin });');


  members.grantRole(SETTER_ROLE, timelock.address, { from: admin });
  console.log('members.grantRole(SETTER_ROLE, timelock.address, { from: admin });');
  
  cohortFactory.grantRole(SETTER_ROLE, timelock.address, { from: admin });
  console.log('cohortFactory.grantRole(SETTER_ROLE, timelock.address, { from: admin });');

  nodeOperations.grantRole(SETTER_ROLE, timelock.address, { from: admin });
  console.log('nodeOperations.grantRole(SETTER_ROLE, timelock.address, { from: admin });');
  
  
  
  token.grantRole(CONTROLLER_ROLE, admin, { from: admin });
  console.log('token.grantRole(CONTROLLER_ROLE, admin, { from: admin });')

  token.grantRole(CONTROLLER_ROLE, members.address, { from: admin });
  console.log('token.grantRole(CONTROLLER_ROLE, members.address, { from: admin });');

  token.grantRole(CONTROLLER_ROLE, memberHelpers.address, { from: admin });
  console.log('token.grantRole(CONTROLLER_ROLE, memberHelpers.address, { from: admin });')


  token.grantRole(CONTROLLER_ROLE, nodeOperations.address, { from: admin });
  console.log('token.grantRole(CONTROLLER_ROLE, nodeOperations.address, { from: admin });');

  token.grantRole(CONTROLLER_ROLE, depositModifiers.address, { from: admin });
  console.log('token.grantRole(CONTROLLER_ROLE, depositModifiers.address, { from: admin });')


  depositModifiers.grantRole(CONTROLLER_ROLE, cohort.address, { from: admin });
  console.log('depositModifiers.grantRole(CONTROLLER_ROLE, cohort.address, { from: admin });');

  depositModifiers.grantRole(CONTROLLER_ROLE, noCohort.address, { from: admin });
  console.log('epositModifiers.grantRole(CONTROLLER_ROLE, noCohort.address, { from: admin });');

  await memberHelpers.setValidation(cohort.address, { from: admin });
  console.log('memberHelpers.setValidation(cohort.address, { from: admin });')

  

  

  members.addUser(validator1, "Validator 1", 1, { from: admin });
  console.log('members.addUser(validator1, "Validator 1", 1, { from: admin });');

  members.addUser(validator2, "Validator 2", 1, { from: admin });
  console.log('members.addUser(validator2, "Validator 2", 1, { from: admin });');

  members.addUser(validator3, "Validator 3", 1, { from: admin });
  console.log('members.addUser(validator3, "Validator 3", 1, { from: admin });');

  members.addUser(validator4, "Validator 4", 1, { from: admin });
  console.log('members.addUser(validator4, "Validator 4", 1, { from: admin });');

  members.addUser(delegating, "delegating", 1, { from: admin });
  console.log('members.addUser(delegating, "delegating", 1, { from: admin });');

  members.addUser(dataSubscriber, "Datasubscriber 1", 2, { from: admin });
  console.log('members.addUser(dataSubscriber, "Datasubscriber 1", 2, { from: admin });');

  members.addUser(enterprise1, "Datasubscriber 2", 0, { from: admin });
  console.log('members.addUser(enterprise1, "Datasubscriber 2", 0, { from: admin });');

  members.addUser(enterprise2, "Datasubscriber 3", 0, { from: admin });
  console.log('members.addUser(enterprise2, "Datasubscriber 3", 0, { from: admin });');


  token.transfer(dataSubscriber, tokenAmount2, { from: admin });
  token.transfer(validator1, tokenAmount3, { from: admin });
  token.transfer(validator2, tokenAmount4, { from: admin });
  token.transfer(validator3, tokenAmount5, { from: admin });
  token.transfer(validator4, tokenAmount2, { from: admin });
  token.transfer(enterprise1, tokenAmount2, { from: admin });
  token.transfer(enterprise2, tokenAmount3, { from: admin });
  await token.transfer(delegating, tokenAmount6, { from: admin });

  console.log("FINISHED");







};
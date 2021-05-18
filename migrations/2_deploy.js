const Members = artifacts.require('./Members.sol');
const Token = artifacts.require('./AuditToken.sol');
const Cohort = require('../build/contracts/Cohort.json');
const CohortFactory = artifacts.require('..build/contracts/CohortFactory.sol');
const CreateCohort = artifacts.require('..build/contracts/CreateCohort.sol');
const GovernorAlpha = artifacts.require('../build/contracts/GovernorAlpha.sol')
const MemberHelpers = artifacts.require('../build/contracts/MemberHelpers.sol');
const NFT = artifacts.require('./RulesERC721Token.sol');


const Timelock = artifacts.require('./Governance/Timelock.sol');
const TestContract = artifacts.require('./Governance/TestSetDelay.sol');

const ethers = require('ethers');
const timeMachine = require('ganache-time-traveler');
const abi = new ethers.utils.AbiCoder();


module.exports = async function (deployer, network, accounts) { // eslint-disable-line..

  let admin = accounts[0];
  // let admin = "0x67794670742BA1E53FD04d8bA22a9b4487CE65B4";

  let controller = accounts[1];
  let dataSubscriber = accounts[2];
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



  let CONTROLLER_ROLE = web3.utils.keccak256("CONTROLLER_ROLE");
  let SETTER_ROLE = web3.utils.keccak256("SETTER_ROLE");

  await deployer.deploy(Token, admin);
  let token = await Token.deployed();

  console.log("token address:", token.address);

  await deployer.deploy(Members, token.address, platformAddress);
  let members = await Members.deployed();

  await deployer.deploy(CreateCohort, members.address, token.address);
  let createCohort = await CreateCohort.deployed();

  await deployer.deploy(CohortFactory, members.address, createCohort.address);
  let cohortFactory = await CohortFactory.deployed();

  await members.grantRole(CONTROLLER_ROLE, admin, { from: admin });
  await token.grantRole(CONTROLLER_ROLE, admin, { from: admin });

  await members.setCohortFactory(cohortFactory.address, { from: admin });

  await deployer.deploy(Timelock, admin, 5);
  let timelock = await Timelock.deployed();

  await deployer.deploy(GovernorAlpha, timelock.address, token.address, admin);
  let gov = await GovernorAlpha.deployed();


  await deployer.deploy(TestContract, 5);
  await TestContract.deployed();

  await deployer.deploy(MemberHelpers, members.address);
  let memberHelper = await MemberHelpers.deployed();

  await deployer.deploy(NFT, "Test", "Test");
  let nft = await NFT.deployed();

  await timelock.setPendingAdmin(gov.address, { from: admin });
  await timelock.acceptAdmin({ from: admin });

  await members.grantRole(CONTROLLER_ROLE, controller, { from: admin });
  await members.grantRole(CONTROLLER_ROLE, admin, { from: admin });
  // await token.grantRole(CONTROLLER_ROLE, admin, { from: admin });

  await cohortFactory.grantRole(SETTER_ROLE, timelock.address, { from: admin });
  await members.grantRole(SETTER_ROLE, timelock.address, { from: admin });

  await cohortFactory.grantRole(SETTER_ROLE, timelock.address, { from: admin });

  // await cohort.grantRole(SETTER_ROLE, gov.address, { from: admin });



  await members.setCohortFactory(cohortFactory.address, { from: admin });
  await token.grantRole(CONTROLLER_ROLE, members.address, { from: admin });


  // await members.addUser(admin, "Admin 1", 0, { from: controller });

  await members.addUser(enterprise1, "Enterprise 1", 0, { from: controller });
  await members.addUser(enterprise2, "Enterprise 2", 0, { from: controller });

  await members.addUser(validator1, "Validators 1", 1, { from: controller });
  await members.addUser(validator2, "Validators 2", 1, { from: controller });
  await members.addUser(validator3, "Validators 3", 1, { from: controller });
  await members.addUser(validator4, "Validators 4", 1, { from: controller });


  await token.transfer(accounts[1], tokenAmount1);
  await token.transfer(accounts[2], tokenAmount2);
  await token.transfer(accounts[3], tokenAmount3);
  await token.transfer(accounts[4], tokenAmount4);
  await token.transfer(accounts[5], tokenAmount5);
  await token.transfer(accounts[6], tokenAmount2);
  await token.transfer(accounts[7], tokenAmount2);
  await token.transfer(accounts[8], tokenAmount3);




  await token.approve(members.address, validatorAmountMax, { from: validator1 });
  await token.approve(members.address, validatorAmountMin, { from: validator2 });
  await token.approve(members.address, validatorAmountMin, { from: validator3 });
  await token.approve(members.address, validatorAmountMin, { from: validator4 });
  await token.approve(members.address, validatorAmountMin, { from: enterprise1 });
  await token.approve(members.address, validatorAmountMin, { from: enterprise2 });



  await members.stake(validatorAmountMax, { from: validator1 });
  await members.stake(validatorAmountMin, { from: validator2 });
  await members.stake(validatorAmountMin, { from: validator3 });
  await members.stake(validatorAmountMin, { from: validator4 });
  await members.stake(validatorAmountMin, { from: enterprise1 });

  await cohortFactory.inviteValidatorMultiple([validator1, validator2, validator3, validator4], 0, addressZero, { from: enterprise2 });
  await cohortFactory.inviteValidatorMultiple([validator1, validator2, validator3, validator4], 1, addressZero, { from: enterprise2 });
  await cohortFactory.inviteValidatorMultiple([validator1, validator2, validator3, validator4], 2, addressZero, { from: enterprise2 });
  await cohortFactory.inviteValidatorMultiple([validator1, validator2, validator3], 0, addressZero, { from: enterprise1 });
  await cohortFactory.inviteValidatorMultiple([validator1, validator2, validator3, validator4], 1, addressZero, { from: enterprise1 });
  await cohortFactory.inviteValidatorMultiple([validator1, validator2, validator3, validator4], 2, addressZero, { from: enterprise1 });

  await cohortFactory.acceptInvitation(enterprise2, 0, { from: validator1 });
  await cohortFactory.acceptInvitation(enterprise2, 1, { from: validator2 });
  await cohortFactory.acceptInvitation(enterprise2, 2, { from: validator3 });
  await cohortFactory.acceptInvitation(enterprise2, 3, { from: validator4 });

  await cohortFactory.acceptInvitation(enterprise1, 0, { from: validator1 });
  await cohortFactory.acceptInvitation(enterprise1, 1, { from: validator2 });
  await cohortFactory.acceptInvitation(enterprise1, 2, { from: validator3 });
  // await cohortFactory.acceptInvitation(enterprise1, 3, { from: validator4 });


  await cohortFactory.acceptInvitation(enterprise1, 7, { from: validator1 });
  await cohortFactory.acceptInvitation(enterprise1, 8, { from: validator2 });
  await cohortFactory.acceptInvitation(enterprise1, 9, { from: validator3 });
  await cohortFactory.acceptInvitation(enterprise1, 10, { from: validator4 });

  await createCohort.grantRole(CONTROLLER_ROLE, cohortFactory.address, { from: admin });

  let result = await cohortFactory.createCohort(0, { from: enterprise2 });



  let event = result.logs[1];
  let cohortAddress = event.args.cohort;
  let cohortContract = new web3.eth.Contract(Cohort["abi"], cohortAddress);
  let enterprise = await cohortContract.methods.enterprise().call();
  let validators = await cohortContract.methods.validators(0).call();
  let documentHash = web3.utils.soliditySha3("2+3=4");
  await members.grantRole(CONTROLLER_ROLE, cohortAddress, { from: admin });
  // await token.grantRole(CONTROLLER_ROLE, cohortAddress, { from: admin });

  result = await cohortFactory.createCohort(0, { from: enterprise1 });

  event = result.logs[1];
  cohortAddress = event.args.cohort;
  cohortContract = new web3.eth.Contract(Cohort["abi"], cohortAddress);
  documentHash = web3.utils.soliditySha3("2+3=4");

  await cohortContract.methods.grantRole(CONTROLLER_ROLE, admin).send({ from: admin });
  // await token.grantRole(CONTROLLER_ROLE, cohortAddress, { from: admin });
  await members.grantRole(CONTROLLER_ROLE, cohortAddress, { from: admin });

  result = await cohortContract.methods.initializeValidation(documentHash, "234").send({ from: enterprise1, gas: 6000000 });


  values = result.events.ValidationInitialized.returnValues;
  validationHash = values.validationHash;
  validationTime = values.initTime;

  await cohortContract.methods.validate(documentHash, validationTime, 1).send({ from: validator1, gas: 500000 });
  await cohortContract.methods.validate(documentHash, validationTime, 1).send({ from: validator2, gas: 500000 });
  await cohortContract.methods.validate(documentHash, validationTime, 2).send({ from: validator3, gas: 500000 });
  await cohortContract.methods.validate(documentHash, validationTime, 1).send({ from: validator4, gas: 500000 });

  timeMachine.advanceTimeAndBlock(10);


  documentHash = web3.utils.soliditySha3("2+3=5");
  result = await cohortContract.methods.initializeValidation(documentHash, "234").send({ from: enterprise1, gas: 6000000 });
  timeMachine.advanceTimeAndBlock(10);

  values = result.events.ValidationInitialized.returnValues;
  validationHash = values.validationHash;
  validationTime = values.initTime;

  await cohortContract.methods.validate(documentHash, validationTime, 1).send({ from: validator1, gas: 500000 });
  await cohortContract.methods.validate(documentHash, validationTime, 2).send({ from: validator2, gas: 500000 });
  await cohortContract.methods.validate(documentHash, validationTime, 1).send({ from: validator3, gas: 500000 });
  await cohortContract.methods.validate(documentHash, validationTime, 1).send({ from: validator4, gas: 500000 });

  timeMachine.advanceTimeAndBlock(10);
  result = await cohortFactory.createCohort(2, { from: enterprise1 });
  console.log("cohort", result);


  event = result.logs[1];
  cohortAddress = event.args.cohort;
  cohortContract = new web3.eth.Contract(Cohort["abi"], cohortAddress);


  await members.grantRole(CONTROLLER_ROLE, cohortAddress, { from: admin });


  documentHash = web3.utils.soliditySha3("test5");
  result = await cohortContract.methods.initializeValidation(documentHash, "QmNhaANyYwWmfrRBfMbXyogPhBSTQdzFL8TiWbqjBmNuoc/Auditchain.json").send({ from: enterprise1, gas: 6000000 });
  values = result.events.ValidationInitialized.returnValues;
  validationHash = values.validationHash;
  validationTime = values.initTime;

  await cohortContract.methods.grantRole(CONTROLLER_ROLE, admin).send({ from: admin });
  // await token.grantRole(CONTROLLER_ROLE, cohortAddress, { from: admin });

  await cohortContract.methods.validate(documentHash, validationTime, 1).send({ from: validator1, gas: 900000 });
  await cohortContract.methods.validate(documentHash, validationTime, 1).send({ from: validator2, gas: 900000 });
  await cohortContract.methods.validate(documentHash, validationTime, 1).send({ from: validator3, gas: 900000 });
  await cohortContract.methods.validate(documentHash, validationTime, 1).send({ from: validator4, gas: 900000 });


  documentHash = web3.utils.soliditySha3("test56");
  result = await cohortContract.methods.initializeValidation(documentHash, "QmeS86JjFut8ttA3NWutB4qkum3gQTnD4CtgMBQVvi3b3N/Auditchain.json").send({ from: enterprise1, gas: 6000000 });
  values = result.events.ValidationInitialized.returnValues;
  validationHash = values.validationHash;
  validationTime = values.initTime;

  await cohortContract.methods.grantRole(CONTROLLER_ROLE, admin).send({ from: admin });
  // await token.grantRole(CONTROLLER_ROLE, cohortAddress, { from: admin });

  await cohortContract.methods.validate(documentHash, validationTime, 1).send({ from: validator1, gas: 900000 });
  await cohortContract.methods.validate(documentHash, validationTime, 1).send({ from: validator2, gas: 900000 });
  await cohortContract.methods.validate(documentHash, validationTime, 1).send({ from: validator3, gas: 900000 });
  await cohortContract.methods.validate(documentHash, validationTime, 1).send({ from: validator4, gas: 900000 });

  const validation = await cohortContract.methods.validations(validationHash).call();
  console.log("validation", validation);
  console.log("validation hash", validationHash);

  await token.approve(members.address, subscriberFee, { from: dataSubscriber });

  await members.addUser(dataSubscriber, "Data Subscriber 1", 2, { from: controller });

  await members.dataSubscriberPayment(cohortAddress, 1, { from: dataSubscriber });


  // Governance data
  await token.delegate(accounts[1], { from: accounts[1] });
  await token.delegate(accounts[2], { from: accounts[2] });
  await token.delegate(accounts[4], { from: accounts[4] });
  await token.delegate(accounts[3], { from: accounts[3] });
  await token.delegate(accounts[4], { from: accounts[5] });
  await token.delegate(accounts[1], { from: accounts[0] });
  await token.delegate(accounts[6], { from: accounts[6] });
  await token.delegate(accounts[7], { from: accounts[7] });
  await token.delegate(accounts[8], { from: accounts[8] });

  values = ["0"];
  signatures = ["getBalanceOf(address)", "approve(address)"];

  let description1 = "# Changing SAI collateral factor to 55%\n" +
    "First proposal that intent to slowly close the SAI market.\n" +
    "The [first](https://compound.finance/governance/proposals/3) proposal in this topic has been successfully executed, continuing with recent analysis of accounts.\n" +
    "**Collateral Factor**\n" +
    "Going from 65% to 55% with the current market prices **would cause** two liquidations on the analyzed accounts.\n" +
    "![Analysis](https://i.imgur.com/KIuG5E2.png)\n" +
    "(The list does not contain accounts that hold less than 50 SAI)\n" +
    "[Analyzed accounts](https://i.imgur.com/KIuG5E2.png)\n" +
    "[Forum discussion!](https://compound.comradery.io/post/1600)\n"

  let description2 = "# Adjusting Reserve Factors%\n" +
    "Second proposal that intent to slowly close the SAI market.\n"

  let description3 = "# Uniswap Improvement Strategy\n" +
    "Third proposal that intent to slowly close the SAI market.\n"


  let description4 = "# Upgrade cUSDT Interest Rate Model\n" +
    "Recently, Dharma led the community to release a new upgradable\n" +
    "interest rate model contract for cDAI based on the new JumpRateModelV2.\n" +
    "This proposal updates the cUSDT interest rate model to a recently deployed\n" +
    "JumpRateModelV2 with the same parameters as the current cDAI interest rate model:\n"

  // let calldata = [abi.encode(['address', 'uint256'], [accounts[0], 2]), abi.encode(['address', 'uint256'], [accounts[1], 2])];
  let calldata = [abi.encode(['uint256', 'uint256'], [(5e18).toString(), 0])];

  let signature = ['updateMinValidatorsPerCohort(uint256,uint256)'];

  result = await gov.propose([cohortFactory.address], values, signature, calldata, description1, { from: accounts[2] });

  let test = await gov.getPastEvents('ProposalCreated');

  event = result.logs[0];


  values = ["0", "0"];
  calldata = [abi.encode(['address', 'uint256'], [accounts[0], 2]), abi.encode(['address', 'uint256'], [accounts[1], 2])];
  result = await gov.propose([accounts[1], accounts[3]], values, signatures, calldata, description2, { from: accounts[1] });

  result = await gov.propose([accounts[4], accounts[5]], values, signatures, calldata, description3, { from: accounts[4] });

  result = await gov.castVote(1, 1, { from: accounts[1] });

  await gov.castVote(1, 1, { from: accounts[2] });
  await gov.castVote(1, 1, { from: accounts[3] });
  await gov.castVote(1, 1, { from: accounts[4] });
  await gov.castVote(1, 1, { from: accounts[6] });
  await gov.castVote(1, 1, { from: accounts[7] });



  let receipt = await gov.getReceipt(1, accounts[1]);
  blockNumber = await web3.eth.getBlockNumber();

  let state = await gov.state(1)

  console.log("state before:", state.toString());

  for (x = 1; x <= 300; ++x) {
    timeMachine.advanceBlock();
  }

  blockNumber = await web3.eth.getBlockNumber();
  console.log("block Number after:" + blockNumber);
  state = await gov.state(1)
  console.log("state after:", state.toString());
  await gov.queue(1, { from: accounts[0] });
  timeMachine.advanceTimeAndBlock(60 * 60 * 6);
  await gov.execute(1, { from: accounts[0] });
  blockNumber = await web3.eth.getBlockNumber();



  let newUpdateRewards = await members.amountTokensPerValidation();

  console.log("updateRewards", newUpdateRewards.toString());

  values = ["0", "0"];
  calldata = [abi.encode(['address', 'uint256'], [accounts[0], 2]), abi.encode(['address', 'uint256'], [accounts[1], 2])];

  calldata = [abi.encode(['address', 'uint256'], [accounts[0], 2]), abi.encode(['address', 'uint256'], [accounts[1], 2])];
  result = await gov.propose([accounts[3], accounts[1]], values, signatures, calldata, description4, { from: accounts[3] });
  event = result.logs[0];

  // state = await gov.state(4);
  //  console.log("state:" + state);

  timeMachine.advanceBlock();

  await gov.castVote(4, 0, { from: accounts[1] });
  await gov.castVote(4, 0, { from: accounts[2] });
  await gov.castVote(4, 1, { from: accounts[3] });
  await gov.castVote(4, 1, { from: accounts[4] });
  await gov.castVote(4, 1, { from: accounts[6] });
  await gov.castVote(4, 0, { from: accounts[7] });


  await gov.cancel(2, { from: accounts[0] });

  result = await gov.propose([accounts[1], accounts[2]], values, signatures, calldata, "Test to cancel", { from: accounts[1] });
  await gov.cancel(5, { from: accounts[0] });




  console.log("\n\n" + '"AUDT_TOKEN_ADDRESS":"' + token.address + '",');
  console.log('"MEMBERS_ADDRESS":"' + members.address + '",');
  console.log('"MEMBER_HELPERS_ADDRESS":"' + memberHelper.address + '",');
  console.log('"CREATE_COHORT_ADDRESS":"' + createCohort.address + '",');
  console.log('"COHORT_FACTORY_ADDRESS":"' + cohortFactory.address + '",');
  console.log('"GOVERNOR_ALPHA_ADDRESS":"' + gov.address + '",');
  console.log('"TIMELOCK_ADDRESS":"' + timelock.address + '",');
  console.log('"NFT":"' + nft.address + '"' + "\n\n");



  console.log('COHORT_FACTORY_ADDRESS=' + cohortFactory.address);
  console.log('AUDT_TOKEN_ADDRESS=' + token.address);
  console.log('MEMBER_ADDRESS=' + members.address);
  console.log('MEMBER_HELPERS_ADDRESS=' + memberHelper.address);
  console.log('GOVERNOR_ALPHA_ADDRESS=' + gov.address);
  console.log('TIMELOCK_ADDRESS=' + timelock.address);
  console.log('RULES_NFT_ADDRESS=' + nft.address);


  console.log("React format:" + "\n\n");


  console.log("\n\n" + 'audtTokenAddress:"' + token.address + '",');
  console.log('membersAddress:"' + members.address + '",');
  console.log('memberHelpersAddress:"' + memberHelper.address + '",');
  console.log('createCohortAddress:"' + createCohort.address + '",');
  console.log('cohortFactoryAddress:"' + cohortFactory.address + '",');
  console.log('governorAlphaAddress:"' + gov.address + '",');
  console.log('timelockAddress:"' + timelock.address + '",');
  console.log('rulesNFTAddress:"' + nft.address + '",' + "\n\n");




};
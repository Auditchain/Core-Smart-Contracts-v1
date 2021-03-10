const Members = artifacts.require('./Members.sol');
const Token = artifacts.require('./AuditToken.sol');
// const Cohort = require('../build/contracts/Cohort.json');
const CohortFactory = artifacts.require('..build/contracts/CohortFactory.sol');
const CreateCohort = artifacts.require('..build/contracts/CreateCohort.sol');

// const Comp = artifacts.require('./Governance/AuditToken.sol');
const GovernorAlpha = artifacts.require('./Governance/GovernorAlpha.sol');
const Timelock = artifacts.require('./Governance/Timelock.sol');
const TestContract = artifacts.require('./Governance/TestSetDelay.sol');

module.exports = async function (deployer, network, accounts) { // eslint-disable-line..

  let admin = accounts[0];

  let CONTROLLER_ROLE = web3.utils.keccak256("CONTROLLER_ROLE");

  await deployer.deploy(Token, admin);
  let token = await Token.deployed();

  await deployer.deploy(Members, token.address, admin);
  let members = await Members.deployed();

  await deployer.deploy(CreateCohort, members.address, token.address);
  let createCohort = await CreateCohort.deployed();

  await deployer.deploy(CohortFactory, members.address, createCohort.address);
  let cohortFactory = await CohortFactory.deployed();

  await members.grantRole(CONTROLLER_ROLE, admin, { from: admin });
  await token.grantRole(CONTROLLER_ROLE, admin, { from: admin });

  await members.setCohortFactory(cohortFactory.address, {from:admin});

  await deployer.deploy(Timelock, admin, 5);
  let timelock = await Timelock.deployed();

  await deployer.deploy(GovernorAlpha, timelock.address, token.address, admin);
  let gov = await GovernorAlpha.deployed();


  await deployer.deploy(TestContract, 5);
  await TestContract.deployed();

  await timelock.setPendingAdmin(gov.address, { from: admin });
  await timelock.acceptAdmin({ from: admin });


};

require('babel-register');
require('babel-polyfill');
var dotenv = require("dotenv");
dotenv.config();


const HDWalletProvider = require("truffle-hdwallet-provider");
const MNEMONIC = process.env.MNEMONIC
const INFURA_KEY = process.env.INFURA_KEY

console.log("Infura key:" + process.env.INFURA_KEY);

if (!MNEMONIC || !INFURA_KEY) {


  console.error("Please set a mnemonic and infura key...")
  return
}

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      gas: 0x6691b7,
      gasPrice: 0x01,
      network_id: "*", // Match any network id
      accounts: 10,
      defaultEtherBalance: 1000,
      blockTime: 3
    },
    rinkeby: {
      provider: function () {
        return new HDWalletProvider(
          MNEMONIC,
          "https://rinkeby.infura.io/v3/" + INFURA_KEY
        );
      },
      network_id: "*",
      gas: 0x989680
    },
    ropsten: {
      provider: function () {
        return new HDWalletProvider(
          MNEMONIC,
          "https://ropsten.infura.io/v3/" + INFURA_KEY
        );
      },
      network_id: 3,
      gas: 4500000,
      gasPrice: 1000000000
    },
    kovan: {
      provider: function () {
        return new HDWalletProvider(
          MNEMONIC,
          "https://kovan.infura.io/v3/" + INFURA_KEY
        );
      },
      network_id: "*",
      gas: 0x989680
    },
    goerli: {
      provider: function () {
        return new HDWalletProvider(
          MNEMONIC,
          // "https://goerli.infura.io/v3/" + INFURA_KEY
          "wss://goerli.infura.io/ws/v3/2645f5383f544588975db84a58cd9af6"
          
        );
      },
      network_id: "*",
      gas: 0x989680,
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true,
      websocket: true,
      timeoutBlocks: 50000,
      networkCheckTimeout: 1000000
    },
    coverage: {
      host: 'localhost',
      network_id: '*',
      port: 8555,
      gas: 0xfffffffffff,
      gasPrice: 0x01,
    },
    live: {
      network_id: 1,
      provider: function () {
        return new HDWalletProvider(
          MNEMONIC,
          "https://mainnet.infura.io/v3/" + INFURA_KEY
        );
      },
      gas: 4000000,
      gasPrice: 50000000000
    },
    mocha: {
      reporter: 'eth-gas-reporter',
      reporterOptions: {
        currency: 'USD',
        gasPrice: 2
      }
    },
  },
  compilers: {
    solc: {
      version: '0.8.0',
    },
  },
  settings: {
    optimizer: {
      enabled: false,
      runs: 200
    },
 },

};


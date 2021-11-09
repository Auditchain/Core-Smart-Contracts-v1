// Minimal example illustrating georeferencing this (Pacioli node-like..) script
// args: wallet_private_key, nickname_for_node

require('dotenv').config({ path: './.env' });
const fs = require('fs');
const axios = require("axios");

//blockchain stuff
let ipfsAPI = require("ipfs-api");
let Web3 = require('web3');
let ethers = require('ethers');
let BN = require("big-number");
const web3_reader = new Web3(new Web3.providers.WebsocketProvider(process.env.WEBSOCKET_PROVIDER));

const NON_COHORT = require('../build/contracts/ValidationsNoCohort.json');

const ipfsauth = 'Basic ' + Buffer.from(process.env.IPFS_USER + ':' + process.env.IPFS_PASSWORD).toString('base64');
const ipfs = ipfsAPI({
    host: 'ipfs.infura.io',
    port: 5001,
    protocol: 'https',
    headers: {
        authorization: ipfsauth
    }
})

const nonCohortAddress = process.env.VALIDATIONS_NO_COHORT_ADDRESS;
let nonCohort = new web3_reader.eth.Contract(NON_COHORT["abi"], nonCohortAddress);

/////

const myArgs = process.argv.slice(2);
const nickname = myArgs[1];

const myAddress = web3_reader.eth.accounts.privateKeyToAccount(myArgs[0]).address;

const CACHE_FILENAME = ".myLocation.json";

// cf. https://www.ip2location.com/web-service/ip2location :
const ipLocatorURL = `https://api.ip2location.com/v2/?key=${process.env.LOCATION_KEY}&package=WS5`;

var myLocation;


async function main(){
    // IP lookup:
    if (!process.env.LOCATION_KEY){
        console.log("No LOCATION_KEY avaialble for georeferencing");
        process.exit(1);
    }
    if (fs.existsSync(CACHE_FILENAME)){
        console.log("Loading geo location from cache...");
        myLocation = JSON.parse(fs.readFileSync(CACHE_FILENAME));
    } else {
        console.log(`Querying IP locator service at ${ipLocatorURL}...`);
        myLocation = (await axios.get(ipLocatorURL)).data;
        fs.writeFileSync(CACHE_FILENAME,JSON.stringify(myLocation));
    }   
    
    var validatorDetails = {
        nickname:nickname, address:myAddress, country:myLocation.country_name, city:myLocation.city_name, latitude:myLocation.latitude, longitude:myLocation.longitude
        };

    console.log(validatorDetails);

    // blockchain discovery:
    // validate(documentHash, initTime, subscriber, choice, **valUrl**, reportHash)
    // event : ValidatorValidated(msg.sender, documentHash, validationTime, decision, valUrl)


    //TODO: bound the first block to something more recent
    nonCohort.getPastEvents('ValidatorValidated',{fromBlock:"earliest", toBlock:"latest"}).then( async function(events){
        // reverse order by block number:
        events.sort( (a,b) => (a.blockNumber > b.blockNumber) ? -1 : ((b.blockNumber > a.blockNumber) ? 1 : 0));

        var lastValidations = {}; // map of validator -> its last validation (url,blockNumber)
        for (let e of events) 
            if (!lastValidations[e.returnValues.validator]) {
                var reportPacioli = JSON.parse(await ipfs.files.cat(e.returnValues.valUrl+''))["reportPacioli"];
                lastValidations[e.returnValues.validator] = {
                    valUrl:e.returnValues.valUrl, blockNumber:e.blockNumber, reportPacioli: reportPacioli
                    };
            }

        console.log(lastValidations);

    });
}

main();

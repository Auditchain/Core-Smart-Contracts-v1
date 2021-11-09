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

const CACHE_FILENAME = ".myLocation.json";
// cf. https://www.ip2location.com/web-service/ip2location :
const ipLocatorURL = `https://api.ip2location.com/v2/?key=${process.env.LOCATION_KEY}&package=WS5`;


async function fetchValidatorDetails(key,nickname){
    const myAddress = web3_reader.eth.accounts.privateKeyToAccount(key).address;
    var details = {nickname:nickname, address:myAddress};
    if (process.env.LOCATION_KEY){
        var myLocation;
        if (fs.existsSync(CACHE_FILENAME)){
            console.log("Loading geo location from cache...");
            myLocation = JSON.parse(fs.readFileSync(CACHE_FILENAME));
        } else {
            console.log(`Querying IP locator service at ${ipLocatorURL}...`);
            myLocation = (await axios.get(ipLocatorURL)).data;
            fs.writeFileSync(CACHE_FILENAME,JSON.stringify(myLocation));
        }   
        details['country'] = myLocation.country_name;
        details['city'] = myLocation.city_name;
        details['latitude'] = myLocation.latitude;
        details['longitude'] = myLocation.longitude;
        
    }
    return details;

}

async function main(){
    
    var validatorDetails = await fetchValidatorDetails(myArgs[0],myArgs[1]);

    console.log(validatorDetails);

    // blockchain discovery:

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

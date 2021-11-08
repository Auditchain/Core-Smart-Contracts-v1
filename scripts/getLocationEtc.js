// Minimal example illustrating georeferencing this (Pacioli node-like..) script
// args: wallet_private_key, nickname_for_node

require('dotenv').config({ path: './.env' });
const fs = require('fs');
const axios = require("axios");

const myArgs = process.argv.slice(2);
const nickname = myArgs[1];

const CACHE_FILENAME = ".myLocation.json";

// cf. https://www.ip2location.com/web-service/ip2location :
const ipLocatorURL = `https://api.ip2location.com/v2/?key=${process.env.LOCATION_KEY}&package=WS5`;

var myLocation;

async function main(){
    if (fs.existsSync(CACHE_FILENAME)){
        console.log("Loading geo location from cache...");
        myLocation = JSON.parse(fs.readFileSync(CACHE_FILENAME));
    } else {
        console.log(`Querying IP locator service at ${ipLocatorURL}...`);
        myLocation = (await axios.get(ipLocatorURL)).data;
        fs.writeFileSync(CACHE_FILENAME,JSON.stringify(myLocation));
    }    
    console.log("I am Auditchain node "+nickname+", and these are my details:");
    // console.log("myLocation: "+JSON.stringify(myLocation));
    console.log("Country: "+myLocation.country_name);
    console.log("City: "+myLocation.city_name);
    console.log("Latitude: "+myLocation.latitude);
    console.log("Longitude: "+myLocation.longitude);
}

main();

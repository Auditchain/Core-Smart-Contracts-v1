"use strict";
var express = require('express');
var bodyParser = require('body-parser');
var app = express();
let contract = require('truffle-contract');
let Web3 = require('web3');
let HDWalletProvider = require('@truffle/hdwallet-provider');
// let dotenv = require('dotenv');
// let dotenv = require('dotenv').config({ path: require('find-config')('.env') })
let dotenv = require('dotenv').config({ path: './.env' })

// dotenv.config();


const AUDITTOKEN = require('../build/contracts/AuditToken.json');
const GOVERNOR_ALPHA = require('../build/contracts/GovernorAlpha.json');
const TIMELOCK = require('../build/contracts/Timelock.json');

// import ethereum connection strings. 
const ropsten_infura_server = process.env.ROPSTEN_INFURA_SERVER;
const rinkeby_infura_server = process.env.RINKEBY_INFURA_SERVER;
const main_infura_server = process.env.MAINNET_INFURA_SERVER;
const local_host = process.env.LOCAL;
const mnemonic = process.env.MNEMONIC;




// Address for smart contracts
const auditTokenAddress = process.env.AUDT_TOKEN_ADDRESS;
const governorAlphaAddress = process.env.GOVERNOR_ALPHA_ADDRESS;
const timelockAddress = process.env.TIMELOCK_ADDRESS;

console.log("local_host:" + local_host);
console.log("mnemonic:" + mnemonic);
console.log("audit token:" + auditTokenAddress);

const provider = new HDWalletProvider(mnemonic, local_host); // change to main_infura_server or another testnet. 
const web3 = new Web3(provider);
const owner = provider.addresses[0];

let auditToken = new web3.eth.Contract(AUDITTOKEN["abi"], auditTokenAddress);
let gov = new web3.eth.Contract(GOVERNOR_ALPHA["abi"], governorAlphaAddress);
let timelock = new web3.eth.Contract(TIMELOCK["abi"], timelockAddress);


function timeSince(date) {

    var seconds = Math.floor((new Date() - date) / 1000);

    var interval = seconds / 31536000;

    if (interval > 1) {
        return Math.floor(interval) + " years";
    }
    interval = seconds / 2592000;
    if (interval > 1) {
        return Math.floor(interval) + " months";
    }
    interval = seconds / 86400;
    if (interval > 1) {
        return Math.floor(interval) + " days";
    }
    interval = seconds / 3600;
    if (interval > 1) {
        return Math.floor(interval) + " hours";
    }
    interval = seconds / 60;
    if (interval > 1) {
        return Math.floor(interval) + " minutes";
    }
    return Math.floor(seconds) + " seconds";
}


Number.prototype.formatMoney = function (c, d, t) {
    var n = this,
        c = isNaN(c = Math.abs(c)) ? 2 : c,
        d = d == undefined ? "." : d,
        t = t == undefined ? "," : t,
        s = n < 0 ? "-" : "",
        i = String(parseInt(n = Math.abs(Number(n) || 0).toFixed(c))),
        j = (j = i.length) > 3 ? j % 3 : 0;
    return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
};

const enumerateProposalState = (state) => {
    const proposalStates = ['Pending', 'Active', 'Canceled', 'Defeated', 'Succeeded', 'Queued', 'Expired', 'Executed'];
    return proposalStates[state];
}


function convertTimestamp(timestamp, onlyDate) {
    var d = new Date(timestamp * 1000), // Convert the passed timestamp to milliseconds
        yyyy = d.getFullYear(),
        mm = ('0' + (d.getMonth() + 1)).slice(-2), // Months are zero based. Add leading 0.
        dd = ('0' + d.getDate()).slice(-2), // Add leading 0.
        hh = d.getHours(),
        h = hh,
        min = ('0' + d.getMinutes()).slice(-2), // Add leading 0.
        sec = d.getSeconds(),
        ampm = 'AM',
        time;


    yyyy = ('' + yyyy).slice(-2);

    if (hh > 12) {
        h = hh - 12;
        ampm = 'PM';
    } else if (hh === 12) {
        h = 12;
        ampm = 'PM';
    } else if (hh == 0) {
        h = 12;
    }

    if (onlyDate) {
        time = mm + '/' + dd + '/' + yyyy;

    } else {
        // ie: 2013-02-18, 8:35 AM	
        time = yyyy + '-' + mm + '-' + dd + ', ' + h + ':' + min + ' ' + ampm;
        time = mm + '/' + dd + '/' + yyyy + '  ' + h + ':' + min + ':' + sec + ' ' + ampm;
    }

    return time;
}

async function getProposals(userView, userViewed) {

    let delay = await timelock.methods.delay().call();

    const delegations = await auditToken.getPastEvents('DelegateVotesChanged', {
        fromBlock: 0,
        toBlock: 'latest'
    });
    const delegateAccounts = {};


    delegations.forEach(e => {
        const { delegate, newBalance } = e.returnValues;
        delegateAccounts[delegate] = newBalance;
    });

    let delegatedBalance = 0;
    Object.keys(delegateAccounts).forEach((account) => {
        delegatedBalance += Number(delegateAccounts[account]);
    });

    const proposalCount = await gov.methods.proposalCount().call();

    const proposalGets = [];
    const proposalStateGets = [];

    for (const i of Array.from(Array(parseInt(proposalCount)), (n, i) => i + 1)) {
        proposalGets.push(await gov.methods.proposals(i).call());
        proposalStateGets.push(await gov.methods.state(i).call());
    }

    const proposals = await Promise.all(proposalGets);
    const proposalStates = await Promise.all(proposalStateGets);

    proposals.reverse();
    proposalStates.reverse();

    let forTotalVotes = 0;
    let againstTotalVotes = 0;
    let blockNumber = await web3.eth.getBlockNumber();

    let proposalsArray = [];
    let proposalsArrayUser = [];
    let k = 0;

    for (let i = 0; i < proposals.length; i++) {

        let p = proposals[i];
        const { description } = p;

        p.title = description.split(/# |\n/g)[1] || 'Untitled';
        p.description = description.split(/# |\n/g)[2] || 'No description.';
        p.state = enumerateProposalState(proposalStates[i]);
        p.for_votes = (parseFloat(p.forVotes) / 1e18).toFixed(2);
        p.against_votes = (parseFloat(p.againstVotes) / 1e18).toFixed(2);

        let hours = Math.floor((((p.endBlock - blockNumber) * 15) / 60 / 60));
        let minutes = Math.floor((((p.endBlock - blockNumber) * 15) / 60));
        let days = Math.floor(hours / 24);
        let leftHours = Math.floor(hours % 24);

        if (p.eta > 0)
            p.datePoint = " " + convertTimestamp(p.eta);
        else if (days > 0)
            p.datePoint = hours > 24 ? days + " day(s) " + leftHours + " hrs left" : hours + " hrs left."

        forTotalVotes = Number(p.forVotes);
        againstTotalVotes = Number(p.againstVotes);

        p.percentageFor = Math.round(forTotalVotes * 100 / delegatedBalance);
        p.percentageAgainst = Math.round(againstTotalVotes * 100 / delegatedBalance);
        p.forTotalVotes = Math.round(forTotalVotes == 0 ? 0 : forTotalVotes / Math.pow(10, 21));
        p.againstTotalVotes = Math.round(againstTotalVotes == 0 ? 0 : againstTotalVotes / Math.pow(10, 21));

        if (p.state == "Defeated") {
            p.state = "failed";
            p.status = "Failed"
            p.passed = "not-passed"

            const proposalCreatedEvent = await gov.getPastEvents('ProposalCreated', {
                filter: { id: p.id },
                fromBlock: 0,
                toBlock: 'latest'
            })

            let blockNumber = proposalCreatedEvent[0].blockNumber;
            let block = await web3.eth.getBlock(blockNumber);
            let dateCreated = new Date(convertTimestamp(block.timestamp));
            let failedDate = dateCreated.addDays(Number(delay));

            p.datePoint = failedDate.toLocaleString("en-US", {
                day: "numeric",
                month: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit"
            });
        }

        if (p.state == "Canceled") {
            p.state = "failed";
            p.status = "Canceled";
            p.passed = "not-passed";

            const proposalCanceledEvent = await gov.getPastEvents('ProposalCanceled', {
                filter: { id: p.id },
                fromBlock: 0,
                toBlock: 'latest'
            })

            let blockNumber = proposalCanceledEvent[0].blockNumber;
            let block = await web3.eth.getBlock(blockNumber);

            p.datePoint = convertTimestamp(block.timestamp);
        }

        if (p.state == "Executed") {
            p.state = "active";
            p.status = "Passed"
            p.passed = "passed"

            const proposalExecutedEvent = await gov.getPastEvents('ProposalExecuted', {
                filter: { id: p.id },
                fromBlock: 0,
                toBlock: 'latest'
            })

            let blockNumber = proposalExecutedEvent[0].blockNumber;
            let block = await web3.eth.getBlock(blockNumber);

            p.datePoint = convertTimestamp(block.timestamp);
        }

        if (p.state == "Active" || p.state == "Pending") {

            p.state = "active";
            p.status = "Active";
            p.passed = "active"

            const proposalCreatedEvent = await gov.getPastEvents('ProposalCreated', {
                filter: { id: p.id },
                fromBlock: 0,
                toBlock: 'latest'
            })

            let blockNumber = proposalCreatedEvent[0].blockNumber;
            let block = await web3.eth.getBlock(blockNumber);
            let dateCreated = new Date(convertTimestamp(block.timestamp));
            let endDate = dateCreated.addDays(Number(delay));

            p.created = convertTimestamp(block.timestamp);
            p.datePoint = endDate.toLocaleString("en-US", {
                day: "numeric",
                month: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit"
            });

            let hours = Math.floor((((p.endBlock - blockNumber) * 15) / 60 / 60));
            let minutes = Math.floor((((p.endBlock - blockNumber) * 15) / 60));
            let days = Math.floor(hours / 24);
            let leftHours = Math.floor(hours % 24);
            let timeLeft = "0 minutes left";

            if (p.eta > 0)
                timeLeft = " " + convertTimestamp(proposal.eta);
            else if (days > 0)
                timeLeft = hours > 24 ? days + " day(s) " + leftHours + " hrs left" : hours + " hrs left."
            else if (hours > 0)
                timeLeft = minutes > 60 ? leftHours + " hrs left" : minutes + " hrs left."
            else
                timeLeft = minutes + " minutes left."

            p.datePoint = timeLeft;

        } if (p.state == "Succeeded") {
            p.state = "active";
            p.status = "Succeeded"
            p.passed = "passed"
            let block = await web3.eth.getBlock(p.endBlock);
            p.datePoint = convertTimestamp(block.timestamp);
        }

        proposalsArray[i] = p;

        if (userView) {
            let voted = await gov.methods.getReceipt(p.id, userViewed).call();

            if (voted.hasVoted) {
                if (voted.support) {
                    p.voted = "for";
                    p.vote = "Yes Vote"
                } else {
                    p.voted = "against";
                    p.vote = "No Vote"
                }
                p.showVote = "none"
                proposalsArrayUser[k] = p;
                k++;
            }
        }
    };

    if (userViewed)
        return proposalsArrayUser;
    else
        return proposalsArray;
}


async function getUserActions(userAddress) {


    const DelegateVotesChangedEvent = await auditToken.getPastEvents('DelegateVotesChanged', {
        filter: { delegate: userAddress },
        fromBlock: 0,
        toBlock: 'latest'
    })

    let actions = [];
    for (let i = 0; i < DelegateVotesChangedEvent.length; i++) {
        let p = {};
        let returnValues = DelegateVotesChangedEvent[i].returnValues;
        let blockNumber = DelegateVotesChangedEvent[i].blockNumber;
        let block = await web3.eth.getBlock(blockNumber);

        let actionDate = new Date(convertTimestamp(block.timestamp));

        const temp = (new Date() - actionDate);

        const timeAgo = timeSince(actionDate);

        p.when = timeAgo + " ago";
        p.url = DelegateVotesChangedEvent[i].transactionHash;
        let newBalance = Number(returnValues.newBalance);
        let previousBalance = Number(returnValues.previousBalance);

        if (previousBalance > newBalance) {
            p.action = "Lost Votes"
            p.direction = "decrease"
            if (returnValues.newBalance == 0)
                p.value = 100;
            else
                p.value = (newBalance * 100 / previousBalance).formatMoney(4, ".", ",");
        }
        else {
            p.action = "Received Votes";
            p.direction = "increase";
            if (returnValues.previousBalance == 0)
                p.value = 100;
            else
                p.value = (previousBalance * 100 / newBalance).formatMoney(4, ".", ",");
        }
        actions[i] = p;
    }
    return actions;
}


async function getDelegates() {


    let tokenSupply = await auditToken.methods.totalSupply().call();
    const delegations = await auditToken.getPastEvents('DelegateVotesChanged', {
        fromBlock: 0,
        toBlock: 'latest'
    });

    const votesCast = await gov.getPastEvents('VoteCast', {
        // filter: { voter:  },
        fromBlock: 0,
        toBlock: 'latest'
    });

    const votedAccounts = {}
    votesCast.forEach(e => {
        const { voter } = e.returnValues;
        votedAccounts[voter] = votedAccounts[voter] == undefined ? 1 : votedAccounts[voter] + 1;
    })

    const delegateAccounts = {};

    delegations.forEach(e => {
        const { delegate, newBalance } = e.returnValues;
        delegateAccounts[delegate] = newBalance;
    });

    const delegates = [];
    Object.keys(delegateAccounts).forEach((account) => {
        const voteWeight = +delegateAccounts[account];
        if (voteWeight === 0) return;
        delegates.push({
            delegate: account,
            voteWeight: voteWeight,
            rank: 0,
            votes: voteWeight,
            timesVoted: votedAccounts[account]
        });
    });

    delegates.sort((a, b) => {
        return a.voteWeight < b.voteWeight ? 1 : -1;
    });

    delegates.forEach((d, index) => {
        d.voteWeight = (100 * (d.voteWeight / tokenSupply)).toFixed(2) + '%';
        d.rank = index + 1;
    });
    return delegates

}

async function getOneProposal(proposalId) {
    const proposal = await gov.methods.proposals(proposalId).call();
    return proposal;
}

async function getProposalEvent(proposalId) {

    const proposalCreatedEvent = await gov.getPastEvents('ProposalCreated', {
        filter: { id: proposalId },
        fromBlock: 0,
        toBlock: 'latest'
    })
    return proposalCreatedEvent;
}

async function getProposal(proposalId) {

    const proposal = await gov.methods.proposals(proposalId).call();
    return proposal;
}


async function getProposalState(proposalId) {

    const proposalState = await gov.methods.state(proposalId).call();
    return proposalState;
}


async function getVoteCast(proposalId) {


    const voteCastEvent = await gov.getPastEvents('VoteCast', {
        filter: { proposalId: proposalId },
        fromBlock: 0,
        toBlock: 'latest'
    })

    return voteCastEvent;
}

async function getProposalExecuted(proposalId) {

    const proposalExecutedEvent = await gov.getPastEvents('ProposalExecuted', {
        filter: { id: proposalId },
        fromBlock: 0,
        toBlock: 'latest'
    })

    return proposalExecutedEvent;
}

async function getProposalQueued(proposalId) {
    const proposalQueuedEvent = await gov.getPastEvents('ProposalQueued', {
        filter: { id: proposalId },
        fromBlock: 0,
        toBlock: 'latest'
    })
    return proposalQueuedEvent;
}


async function getProposalCanceled(proposalId) {

    const proposalCanceledEvent = await gov.getPastEvents('ProposalCanceled', {
        filter: { id: proposalId },
        fromBlock: 0,
        toBlock: 'latest'
    })
    return proposalCanceledEvent;
}

Date.prototype.addDays = function (days) {
    var date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
}


app.use(express.static('public'));

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());

// Add headers

app.use(function (req, res, next) {

    // Website you wish to allow to connect

    var allowedOrigins = ['http://localhost:8181', 'http://localhost:8000', 'http://localhost:3000'];
    var origin = req.headers.origin;
    if (allowedOrigins.indexOf(origin) > -1) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});

app.get('/index.htm', function (req, res) {
    res.sendFile(__dirname + "/" + "index.htm");
})



app.get('/get_proposals', function (req, res) {

    let userViewed = req.query.userViewed;
    let userView = req.query.userView;

    getProposals(userView, userViewed).then(async function (returnedData) {
        res.end(JSON.stringify(returnedData));
    }).catch(function (err) {
        console.log(err);
    })
})


app.get('/get_delegates_totals', function (req, res) {


    getDelegates().then(async function (delegates) {

        let totalVotes = 0;

        delegates.forEach((d) => {

            totalVotes += d.votes;
        });
        res.end(JSON.stringify([totalVotes, delegates.length]));
    }).catch(function (err) {
        console.log(err);
    })
})

app.get('/get_one_proposal', function (req, res) {

    let proposalId = req.query.proposalId;
    getOneProposal(proposalId).then(async function (proposal) {

        res.end(JSON.stringify(proposal));
    }).catch(function (err) {
        console.log(err);
    })
})


app.get('/get_proposal_event', function (req, res) {

    let proposalId = req.query.proposalId;
    getProposalEvent(proposalId).then(async function (proposal) {

        res.end(JSON.stringify(proposal));
    }).catch(function (err) {
        console.log(err);
    })
})

app.get('/get_proposal', function (req, res) {

    let proposalId = req.query.proposalId;
    getProposal(proposalId).then(async function (proposal) {

        res.end(JSON.stringify(proposal));
    }).catch(function (err) {
        console.log(err);
    })
})

app.get('/get_proposal_state', function (req, res) {

    let proposalId = req.query.proposalId;
    getProposalState(proposalId).then(async function (proposal) {

        res.end(JSON.stringify(proposal));
    }).catch(function (err) {
        console.log(err);
    })
})

app.get('/get_proposal_vote_cast', function (req, res) {

    let proposalId = req.query.proposalId;
    getVoteCast(proposalId).then(async function (proposal) {

        res.end(JSON.stringify(proposal));
    }).catch(function (err) {
        console.log(err);
    })
})


app.get('/get_proposal_executed', function (req, res) {

    let proposalId = req.query.proposalId;
    getProposalExecuted(proposalId).then(async function (proposal) {

        res.end(JSON.stringify(proposal));
    }).catch(function (err) {
        console.log(err);
    })
})

app.get('/get_proposal_queued', function (req, res) {

    let proposalId = req.query.proposalId;
    getProposalQueued(proposalId).then(async function (proposal) {

        res.end(JSON.stringify(proposal));
    }).catch(function (err) {
        console.log(err);
    })
})


app.get('/get_proposal_canceled', function (req, res) {

    let proposalId = req.query.proposalId;
    getProposalCanceled(proposalId).then(async function (proposal) {

        res.end(JSON.stringify(proposal));
    }).catch(function (err) {
        console.log(err);
    })
})










app.get('/get_user_actions', function (req, res) {

    const userAddress = req.query.userAddress;
    getUserActions(userAddress).then(async function (returnedData) {
        res.end(JSON.stringify(returnedData));
    }).catch(function (err) {
        console.log(err);
    })
})

app.get('/get_user_values', function (req, res) {

    const userAddress = req.query.userAddress;

    async function getUserValues() {

        const govBalance = await auditToken.methods.balanceOf(userAddress).call();
        const currentVotes = await auditToken.methods.getCurrentVotes(userAddress).call();
        const delegatingTo = await auditToken.methods.delegates(userAddress).call();

        const DelegateVotesChangedEvent = await auditToken.getPastEvents('DelegateVotesChanged', {
            filter: { delegate: userAddress },
            fromBlock: 0,
            toBlock: 'latest'
        })
        return [govBalance, currentVotes, delegatingTo, DelegateVotesChangedEvent.length];
    }

    getUserValues(userAddress).then(async function (returnedData) {
        res.end(JSON.stringify(returnedData));
    }).catch(function (err) {
        console.log(err);
    })
})



app.get('/get_delegates', function (req, res) {

    getDelegates().then(async function (returnedData) {
        res.end(JSON.stringify(returnedData));
    }).catch(function (err) {
        console.log(err);
    })

})


var server = app.listen(8182, function () {
    var host = server.address().address
    var port = server.address().port
    console.log("Governance app listening at http://%s:%s", host, port)

})

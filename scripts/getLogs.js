"use strict";
var express = require('express');
var bodyParser = require('body-parser');
var app = express();
let contract = require('truffle-contract');
let Web3 = require('web3');
let HDWalletProvider = require('@truffle/hdwallet-provider');
// let dotenv = require('dotenv');
// dotenv.config();
let dotenv = require('dotenv').config({ path: './.env' })

const AUDITTOKEN = require('../build/contracts/AuditToken.json');
const MEMBERS = require('../build/contracts/Members.json');
const MEMBER_HELPERS = require('../build/contracts/MemberHelpers.json');
const DEPOSIT_MODIFIERS = require('../build/contracts/DepositModifiers.json');
const NODE_OPERATIONS = require('../build/contracts/NodeOperations.json');
const COHORT_FACTORY = require('../build/contracts/CohortFactory.json');
const NO_COHORT = require('../build/contracts/ValidationsNoCohort.json');
const COHORT = require('../build/contracts/ValidationsCohort.json');
const GOVERNANCE = require('../build/contracts/GovernorAlpha.json');







const NFT = require('../build/contracts/RulesERC721Token.json')

// import ethereum connection strings. 
const ropsten_infura_server = process.env.ROPSTEN_INFURA_SERVER;
const rinkeby_infura_server = process.env.RINKEBY_INFURA_SERVER;
const main_infura_server = process.env.MAINNET_INFURA_SERVER;
const mumbai_server = process.env.MUMBAI_SERVER;
const local_host = process.env.LOCAL;
const mnemonic = process.env.MNEMONIC;

// Address for smart contracts
const auditTokenAddress = process.env.AUDT_TOKEN_ADDRESS;
const membersAddress = process.env.MEMBER_ADDRESS;
const memberHelpersAddress = process.env.MEMBER_HELPERS_ADDRESS;
const rulesNFTAddress = process.env.RULES_NFT_ADDRESS
const depositModifiersAddress = process.env.DEPOSIT_MODIFIERS_ADDRESS;
const nodeOperationsAddress = process.env.NODE_OPERATIONS_ADDRESS;
const cohortFactoryAddress = process.env.COHORT_FACTORY_ADDRESS;
const noCohortAddress = process.env.VALIDATIONS_NO_COHORT_ADDRESS;
const cohortAddress = process.env.VALIDATIONS_COHORT_ADDRESS;
const governanceAddress = process.env.GOVERNOR_ALPHA_ADDRESS;








const provider = new HDWalletProvider(mnemonic, mumbai_server); // change to main_infura_server or another testnet. 
const web3 = new Web3(provider);
const owner = provider.addresses[0];

let token = new web3.eth.Contract(AUDITTOKEN["abi"], auditTokenAddress);
let members = new web3.eth.Contract(MEMBERS["abi"], membersAddress);
let membersHelper = new web3.eth.Contract(MEMBER_HELPERS["abi"], memberHelpersAddress);
let depositModifiers = new web3.eth.Contract(DEPOSIT_MODIFIERS["abi"], depositModifiersAddress);
let nodeOperations = new web3.eth.Contract(NODE_OPERATIONS["abi"], nodeOperationsAddress);
let cohortFactory = new web3.eth.Contract(COHORT_FACTORY["abi"], cohortFactoryAddress);
let noCohort = new web3.eth.Contract(NO_COHORT["abi"], noCohortAddress);
let cohort = new web3.eth.Contract(COHORT["abi"], cohortAddress);
let gov = new web3.eth.Contract(GOVERNANCE["abi"], governanceAddress);








let nft = new web3.eth.Contract(NFT["abi"], rulesNFTAddress);



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

async function LogDepositReceived(filter) {

    try {
        const result = await membersHelper.getPastEvents('LogDepositReceived', {
            filter: { from: filter },
            fromBlock: 0,
            toBlock: 'latest'
        });

        return result;
    } catch (err) {
        console.log(err);
    }

}

async function LogDepositRedeemed(filter) {

    try {
        const result = await membersHelper.getPastEvents('LogDepositRedeemed', {
            filter: { from: filter },
            fromBlock: 0,
            toBlock: 'latest'
        });

        return result;
    } catch (err) {
        console.log(err);
    }

}


async function LogDataSubscriberValidatorPaid(filter) {

    try {
        const result = await depositModifiers.getPastEvents('LogDataSubscriberValidatorPaid', {
            filter: { validator: filter },
            fromBlock: 0,
            toBlock: 'latest'
        });

        return result;
    } catch (err) {
        console.log(err);
    }

}


async function LogDataSubscriberPaid(filter) {

    try {
        const result = await depositModifiers.getPastEvents('LogDataSubscriberPaid', {
            filter: { validator: filter },
            fromBlock: 0,
            toBlock: 'latest'
        });

        return result;
    } catch (err) {
        console.log(err);
    }

}


async function LogFeesReceived(filter) {

    try {
        const result = await depositModifiers.getPastEvents('LogFeesReceived', {
            filter: { validator: filter },
            fromBlock: 0,
            toBlock: 'latest'
        });


        return result;
    } catch (err) {
        console.log(err);
    }

}


async function LogNonCohortValidationPaid(filter) {

    try {
        const result = await depositModifiers.getPastEvents('LogNonCohortValidationPaid', {
            filter: { validator: filter },
            fromBlock: 0,
            toBlock: 'latest'
        });

        return result;
    } catch (err) {
        console.log(err);
    }

}

async function LogStakingRewardsClaimed(filter) {

    try {
        const result = await nodeOperations.getPastEvents('LogStakingRewardsClaimed', {
            filter: { validator: filter },
            fromBlock: 0,
            toBlock: 'latest'
        });

        return result;
    } catch (err) {
        console.log(err);
    }

}





async function LogRewardsDeposited(filter) {

    try {
        const result = await depositModifiers.getPastEvents('LogRewardsDeposited', {
            filter: { enterprise: filter },
            fromBlock: 0,
            toBlock: 'latest'
        });

        return result;
    } catch (err) {
        console.log(err);
    }

}



async function CohortCreated(filter) {

    try {
        const result = await cohortFactory.getPastEvents('CohortCreated', {
            filter: { enterprise: filter },
            fromBlock: 0,
            toBlock: 'latest'
        });

        return result;
    } catch (err) {
        console.log(err);
    }

}


async function ValidatorValidated(filter) {

    try {
        const result = await noCohort.getPastEvents('ValidatorValidated', {
            filter: { enterprise: filter },
            fromBlock: 0,
            toBlock: 'latest'
        });

        return result;
    } catch (err) {
        console.log(err);
        let noCohort = new web3.eth.Contract(NO_COHORT["abi"], noCohortAddress);
    }

}


async function ValidatorValidatedDocumentHash(filter) {

    try {
        const result = await noCohort.getPastEvents('ValidatorValidated', {
            filter: { documentHash: filter },
            fromBlock: 0,
            toBlock: 'latest'
        });

        return result;
    } catch (err) {
        console.log(err);
        let noCohort = new web3.eth.Contract(NO_COHORT["abi"], noCohortAddress);
    }

}

async function ValidationInitialized(filter) {

    try {
        const result = await cohort.getPastEvents('ValidationInitialized', {
            filter: { user: filter },
            fromBlock: 0,
            toBlock: 'latest'
        });

        return result;
    } catch (err) {
        console.log(err);
    }

}


async function ValidationInitializedNoCohort(filter) {

    try {
        const result = await noCohort.getPastEvents('ValidationInitialized', {
            filter: { user: filter },
            fromBlock: 0,
            toBlock: 'latest'
        });
        cohortFactory
        return result;
    } catch (err) {
        console.log(err);
    }

}

async function UserAdded(filter) {

    try {
        let result;

        if (filter) {
            result = await members.getPastEvents('UserAdded', {
                filter: { userType: filter },
                fromBlock: 0,
                toBlock: 'latest'
            });
        } else {
            result = await members.getPastEvents('UserAdded', {
                fromBlock: 0,
                toBlock: 'latest'
            });
        }

        return result;
    } catch (err) {
        console.log(err);
    }

}


async function DelegateVotesChanged() {

    try {
        const result = await token.getPastEvents('DelegateVotesChanged', {
            fromBlock: 0,
            toBlock: 'latest'
        });

        return result;
    } catch (err) {
        console.log(err);
    }

}


async function ProposalCreated(filter) {

    try {
        const result = await gov.getPastEvents('ProposalCreated', {
            filter: { id: filter },
            fromBlock: 0,
            toBlock: 'latest'
        });

        return result;
    } catch (err) {
        console.log(err);
    }

}



async function ProposalCanceled(filter) {

    try {
        const result = await gov.getPastEvents('ProposalCanceled', {
            filter: { id: filter },
            fromBlock: 0,
            toBlock: 'latest'
        });

        return result;
    } catch (err) {
        console.log(err);
    }

}


async function ValidatorInvited(filter1, filter2) {

    try {
        const result = await cohortFactory.getPastEvents('ValidatorInvited', {
            filter: { invitee: filter1, audits: filter2 },
            fromBlock: 0,
            toBlock: 'latest'
        });

        return result;
    } catch (err) {
        console.log(err);
    }

}


app.get('/ValidatorInvited', function (req, res) {

    let filter1 = req.query.filter1;
    let filter2 = req.query.filter2;


    ValidatorInvited(filter1, filter2).then(async function (returnedData) {
        res.end(JSON.stringify(returnedData));
    }).catch(function (err) {
        console.log(err);
    })

})


async function ProposalExecuted(filter) {

    try {
        const result = await gov.getPastEvents('ProposalExecuted', {
            filter: { id: filter },
            fromBlock: 0,
            toBlock: 'latest'
        });

        return result;
    } catch (err) {
        console.log(err);
    }

}


async function RequestExecuted(filter) {

    try {
        const result = await cohort.getPastEvents('RequestExecuted', {
            filter: { audits: filter },
            fromBlock: 0,
            toBlock: 'latest'
        });

        return result;
    } catch (err) {
        console.log(err);
    }

}


async function RequestExecutedRequestor(filter) {

    try {
        const result = await cohort.getPastEvents('RequestExecuted', {
            filter: { audits: 1, requestor:filter },
            fromBlock: 0,
            toBlock: 'latest'
        });

        return result;
    } catch (err) {
        console.log(err);
    }

}


app.get('/RequestExecutedRequestor', function (req, res) {

    let filter = req.query.filter;

    RequestExecutedRequestor(filter).then(async function (returnedData) {
        res.end(JSON.stringify(returnedData));
    }).catch(function (err) {
        console.log(err);
    })

})

app.get('/RequestExecuted', function (req, res) {

    let filter = req.query.filter;

    RequestExecuted(filter).then(async function (returnedData) {
        res.end(JSON.stringify(returnedData));
    }).catch(function (err) {
        console.log(err);
    })

})



app.get('/ProposalExecuted', function (req, res) {

    let filter = req.query.filter;

    ProposalExecuted(filter).then(async function (returnedData) {
        res.end(JSON.stringify(returnedData));
    }).catch(function (err) {
        console.log(err);
    })

})








app.get('/ProposalCanceled', function (req, res) {

    let filter = req.query.filter;

    ProposalCanceled(filter).then(async function (returnedData) {
        res.end(JSON.stringify(returnedData));
    }).catch(function (err) {
        console.log(err);
    })

})


app.get('/ProposalCreated', function (req, res) {

    let filter = req.query.filter;

    ProposalCreated(filter).then(async function (returnedData) {
        res.end(JSON.stringify(returnedData));
    }).catch(function (err) {
        console.log(err);
    })

})


app.get('/DelegateVotesChanged', function (req, res) {

    DelegateVotesChanged().then(async function (returnedData) {
        res.end(JSON.stringify(returnedData));
    }).catch(function (err) {
        console.log(err);
    })

})


app.get('/ValidationInitializedNoCohort', function (req, res) {

    let filter = req.query.filter;

    ValidationInitializedNoCohort(filter).then(async function (returnedData) {
        res.end(JSON.stringify(returnedData));
    }).catch(function (err) {
        console.log(err);
    })

})


app.get('/UserAdded', function (req, res) {

    let filter = req.query.filter;

    UserAdded(filter).then(async function (returnedData) {
        res.end(JSON.stringify(returnedData));
    }).catch(function (err) {
        console.log(err);
    })

})


app.get('/ValidationInitialized', function (req, res) {

    let filter = req.query.filter;

    ValidationInitialized(filter).then(async function (returnedData) {
        res.end(JSON.stringify(returnedData));
    }).catch(function (err) {
        console.log(err);
    })

})


app.get('/ValidatorValidatedDocumentHash', function (req, res) {

    let filter = req.query.filter;

    ValidatorValidatedDocumentHash(filter).then(async function (returnedData) {
        res.end(JSON.stringify(returnedData));
    }).catch(function (err) {
        console.log(err);
    })

})


async function ValidatorValidated3filter(filter1, filter2, filter3) {

    try {
        const result = await noCohort.getPastEvents('ValidatorValidated', {
            filter: { documentHash: filter1, validator: filter2, executionTime:filter3 },
            fromBlock: 0,
            toBlock: 'latest'
        });

        return result;
    } catch (err) {
        console.log(err);
        let noCohort = new web3.eth.Contract(NO_COHORT["abi"], noCohortAddress);
    }

}


async function ValidatorValidated2filter(filter1, filter2) {

    try {
        const result = await noCohort.getPastEvents('ValidatorValidated', {
            filter: { documentHash: filter1, validator: filter2 },
            fromBlock: 0,
            toBlock: 'latest'
        });

        return result;
    } catch (err) {
        console.log(err);
        let noCohort = new web3.eth.Contract(NO_COHORT["abi"], noCohortAddress);
    }

}


app.get('/ValidatorValidated2filter', function (req, res) {

    let filter1 = req.query.filter1;
    let filter2 = req.query.filter2;


    ValidatorValidated2filter(filter1, filter2).then(async function (returnedData) {
        res.end(JSON.stringify(returnedData));
    }).catch(function (err) {
        console.log(err);
    })

})

app.get('/ValidatorValidated3filter', function (req, res) {

    let filter1 = req.query.filter1;
    let filter2 = req.query.filter2;
    let filter3 = req.query.filter3;


    ValidatorValidated3filter(filter1, filter2, filter3).then(async function (returnedData) {
        res.end(JSON.stringify(returnedData));
    }).catch(function (err) {
        console.log(err);
    })

})


app.get('/ValidatorValidated', function (req, res) {

    let filter = req.query.filter;

    ValidatorValidated(filter).then(async function (returnedData) {
        res.end(JSON.stringify(returnedData));
    }).catch(function (err) {
        console.log(err);
    })

})

app.get('/CohortCreated', function (req, res) {

    let filter = req.query.filter;

    CohortCreated(filter).then(async function (returnedData) {
        res.end(JSON.stringify(returnedData));
    }).catch(function (err) {
        console.log(err);
    })

})


app.get('/LogRewardsDeposited', function (req, res) {

    let filter = req.query.filter;

    LogRewardsDeposited(filter).then(async function (returnedData) {
        res.end(JSON.stringify(returnedData));
    }).catch(function (err) {
        console.log(err);
    })

})


app.get('/LogStakingRewardsClaimed', function (req, res) {

    let filter = req.query.filter;

    LogStakingRewardsClaimed(filter).then(async function (returnedData) {
        res.end(JSON.stringify(returnedData));
    }).catch(function (err) {
        console.log(err);
    })

})


app.get('/LogFeesReceived', function (req, res) {

    let filter = req.query.filter;

    LogFeesReceived(filter).then(async function (returnedData) {
        res.end(JSON.stringify(returnedData));
    }).catch(function (err) {
        console.log(err);
    })

})


app.get('/LogNonCohortValidationPaid', function (req, res) {

    let filter = req.query.filter;

    LogNonCohortValidationPaid(filter).then(async function (returnedData) {
        res.end(JSON.stringify(returnedData));
    }).catch(function (err) {
        console.log(err);
    })

})

app.get('/LogDataSubscriberPaid', function (req, res) {

    let filter = req.query.filter;

    LogDataSubscriberPaid(filter).then(async function (returnedData) {
        res.end(JSON.stringify(returnedData));
    }).catch(function (err) {
        console.log(err);
    })

})

app.get('/LogDataSubscriberValidatorPaid', function (req, res) {

    let filter = req.query.filter;

    LogDataSubscriberValidatorPaid(filter).then(async function (returnedData) {
        res.end(JSON.stringify(returnedData));
    }).catch(function (err) {
        console.log(err);
    })

})

app.get('/LogDepositReceived', function (req, res) {

    let filter = req.query.filter;

    LogDepositReceived(filter).then(async function (returnedData) {
        res.end(JSON.stringify(returnedData));
    }).catch(function (err) {
        console.log(err);
    })

})

app.get('/LogDepositRedeemed', function (req, res) {

    let filter = req.query.filter;

    LogDepositRedeemed(filter).then(async function (returnedData) {
        res.end(JSON.stringify(returnedData));
    }).catch(function (err) {
        console.log(err);
    })

})



var server = app.listen(8181, function () {
    var host = server.address().address
    var port = server.address().port
    console.log("Example app listening at http://%s:%s", host, port)

})

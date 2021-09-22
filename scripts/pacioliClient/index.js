const pacioli = function(){
    const process = require('process');
    const os = require('os');
    const fs = require('fs');
    const https = require('https');
    const { execSync } = require('child_process');

    // make sure to have axios installed in your node_modules directory:
    const axios = require("axios");

    // These could come all from our environment:
    const ENV = Object.assign({
        "PACIOLI_HOST":"https://pacioli.auditchain.finance", // used for callRemote, and to determine URL of generated reports
        "PROLOG_COMMAND":"/Applications/SWI-Prolog8.2.1-1.app/Contents/MacOS/swipl",
        "PACIOLI_DIRECTORY":"/Users/mc/git/Reporting-Validation-Engine",
        "PACIOLI_USER":"pacioli@auditchain.com", // used for the http client user-agent
        // needed only for XBRL syntax validation and inline XBRL extraction:
        "ARELLE_DIR":"/Users/mc/git/Arelle",
        // needed only if Pacioli saves to IPFS:
        "IPFS_NODE":"https://ipfs.infura.io:5001",
        "IPFS_USER":"1xAgPuFTqkyjDxITICfVMkGrALU",
        "IPFS_PASSWORD":"862f9548e472977b5395e9f52e9cc164",
        "IPFS_GATEWAY":"https://ipfs.infura.io/ipfs/"
    }, process.env);
    const PUBLIC_URL_ROOT = ENV.PACIOLI_HOST;

    var fileCounter = 0;
    
    var self = {
        /**
         * 
         * @param {*} REPORT_URL web URL of XBRL instance report or taxonomy file 
         * @param {*} MY_ADDRESS wallet or transaction string
         * @param {*} SaveToIPFS whether to save the resulting report to a IPFS directory
         * @returns 
         */
        callLocal: async function(REPORT_URL,MY_ADDRESS='someAddress',SaveToIPFS=false){
            const tmpFile = os.tmpdir()+"/"+process.pid+"_"+(fileCounter++)+".json";
            // hacky way to pass command line arguments... see these_parameters/2 in webapi.pl
            var ARGS = [
                "--stack_limit=768m",
                "-g 'webapi:cli_api_main, halt(0)'",
                `${ENV.PACIOLI_DIRECTORY}/swish/user_module_for_swish.pl`,
                "--peer myIP",
                "--jsonResultFile", tmpFile,
                "--",
                "'generateHiddenHTML(true,[default(false)])'",
                "\"url('"+REPORT_URL+"',[])\"",
                "\"address('"+ MY_ADDRESS + "',[default('')])\"",
                "'saveToIPFS("+SaveToIPFS+",[default(false)])'",
                "'noXBRLvalidation(false,[default(false)])'",
                "'autoloadSECvintageReportingStyle(true,[default(false)])'",
                "'valueAssertionsCanDerive(true,[default(false)])'",
                "'lastPeriodOnly(true,[default(false)])'",
                "'definitionGraphs(false,[default(false)])'",
                "'format(json,[default(html)])'",
                "'extendedJSON(true,[default(false)])'",
                "'apiToken(dummyToken,[optional(true)])'"
            ];
            var theCommand = ENV.PROLOG_COMMAND+" "+ARGS.join(" ");
            // console.log("theCommand: "+theCommand);
            var S = execSync(theCommand, {cwd:ENV.PACIOLI_DIRECTORY, env:Object.assign(ENV,{'PUBLIC_URL_ROOT':PUBLIC_URL_ROOT})});
            // console.log("Output: "+S);
            var result = JSON.parse(fs.readFileSync(tmpFile));
            fs.unlink(tmpFile,function(){});
            return result;
        },
        callRemote: async function(REPORT_URL,MY_ADDRESS='someAddress',SaveToIPFS=false){
            var axiosToCall = ENV.PACIOLI_HOST+
                "/analyseReport_?format=json&apiToken=dummyToken&isLinkbase=false&extendedJSON=true&generateHiddenHTML=true&address="+MY_ADDRESS+
                "&autoloadSECvintageReportingStyle=true&valueAssertionsCanDerive=true&lastPeriodOnly=true"+
                "&saveToIPFS="+SaveToIPFS+
                "&url="+REPORT_URL;
            const agent = new https.Agent({  
                rejectUnauthorized: false // HACK to avoid certificate error
              });
            var X = await axios.get(axiosToCall, { httpsAgent: agent });
            return X.data;
        }

    };
    return self;
}();

exports.callLocal = pacioli.callLocal;
exports.callRemote = pacioli.callRemote;

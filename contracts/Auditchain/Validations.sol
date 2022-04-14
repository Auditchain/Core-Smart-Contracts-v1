// SPDX-License-Identifier: MIT
pragma solidity =0.8.0;

import "./INodeOperations.sol";
import "./Members.sol";
import "./DepositModifiers.sol";
import "./ICohortFactory.sol";
import "./IValidationHelpers.sol";
import "./Queue.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";


/**
 * @title Validations
 * Allows on validation with and without cohort requested by data subscribers. 
 */
abstract contract Validations is  ReentrancyGuard{
    using SafeMath for uint256;
    Members public members;
    Queue public queue;
    MemberHelpers public memberHelpers;
    DepositModifiers public depositModifiers;
    ICohortFactory public cohortFactory;
    INodeOperations public nodeOperations;
    IValidatinosHelpers public validationHelpers;
    mapping(address => uint256) public outstandingValidations;

    // Audit types to be used. Three types added for future expansion
    enum AuditTypes {Unknown, Financial, System, NFT, Type4, Type5, Type6}

    AuditTypes public audits;

    // Validation can be approved or disapproved. Initial status is undefined.
    enum ValidationStatus {Undefined, Yes, No}        
    

    struct Validation {
        bool cohort;
        address requestor;
        uint256 validationTime;
        uint256 executionTime;
        string url;
        uint256 consensus;
        uint256 validationsCompleted;
        AuditTypes auditType;
        mapping(address => ValidationStatus) validatorChoice;
        mapping(address => uint256) validatorTime;
        mapping(address => string) validationUrl;
        mapping(address => uint256) winnerVotesPlus;
        mapping(address => uint256) winnerVotesMinus;
        mapping(address => bytes32) validationHash;
        uint64 winnerConfirmations;
        address winner;
        uint256 stakeValue;
    }

    mapping(address => mapping (bytes32=> bool)) public votes;
    
    // struct activeOpertor{

    //     bytes32 validationHash;
    //     uint256 operatorsTotalStake;
    // }

    mapping(uint256 => mapping(bytes32 => uint256)) public activeOperatorsStake;

    uint256 public recentTimestamp;
    bytes32 public recentValidationHash;
    uint256 public quorum = 100;                                  //first validator will be 100% quorum


    mapping(bytes32 => Validation) public validations; // track each validation

    event ValidationInitialized(address indexed user, bytes32 indexed validationHash, uint256 initTime, bytes32 documentHash, string url, AuditTypes indexed auditType);
    event ValidatorValidated(address indexed validator, bytes32 indexed documentHash, uint256 indexed validationTime, ValidationStatus decision, string valUrl);
    event RequestExecuted(uint256 indexed audits, address indexed requestor, bytes32 indexed validationHash, bytes32 documentHash, uint256 consensus, uint256 quorum,  uint256 timeExecuted, string url, address[] winners);
    event PaymentProcessed(bytes32 validationHash, address winner, uint256 pointsPlus, uint256 pointsMinus);
    event WinnerVoted(address validator, address winner, bool isValid);


    constructor(address _members, address _memberHelpers, address _cohortFactory, address _depositModifiers, address _nodeOperations, address _validationHelpers, address __queue) {

        members = Members(_members);
        memberHelpers = MemberHelpers(_memberHelpers);
        cohortFactory = ICohortFactory(_cohortFactory);
        depositModifiers = DepositModifiers(_depositModifiers);
        nodeOperations = INodeOperations(_nodeOperations);
        validationHelpers = IValidatinosHelpers(_validationHelpers);
        queue = Queue(__queue);
        // _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);

    }

    function updateQuorum(bytes32 _recentValidationHash, uint256 _operatorStake, uint256 _recentTimestamp) internal {
            activeOperatorsStake[_recentTimestamp][_recentValidationHash] = 
            activeOperatorsStake[_recentTimestamp][_recentValidationHash].add( _operatorStake);
    }

   /**
   * @dev verify if requesting party has sufficient funds
   * @param requestor a user whos funds are checked
   * @return true or false 
   */
   function checkIfRequestorHasFunds(address requestor) public virtual view returns (bool) {
      
    }
 
   
    /**
     * @dev to be called by Enterprise to initiate new validation
     * @param documentHash - hash of unique identifier of validated transaction
     * @param url - locatoin of the file on IPFS or other decentralized file storage
     * @param auditType - type of auditing 
     */
    function initializeValidation(bytes32 documentHash, string memory url, AuditTypes auditType, bool isCohort, uint256 price) internal virtual {
        require(documentHash.length > 0, "Validation:initializeValidation - Document hash value can't be 0");

        uint256 validationTime = block.timestamp;
        bytes32 validationHash = keccak256(abi.encodePacked(documentHash, validationTime, msg.sender));

        outstandingValidations[msg.sender]++;
        Validation storage newValidation = validations[validationHash];

        newValidation.url = url; 
        newValidation.validationTime = validationTime;
        newValidation.requestor = msg.sender;
        newValidation.auditType = auditType;
        newValidation.cohort = isCohort;

        queue.addToQueue(price, validationHash );

        emit ValidationInitialized(msg.sender, validationHash, validationTime, documentHash, url, auditType);   
    }


    function voteWinner(address[] memory winners, bool[] memory vote,  bytes32 validationHash) public {

        Validation storage validation = validations[validationHash];

        for (uint8 i=0; i< winners.length; i++){
            if (vote[i])
                validation.winnerVotesPlus[winners[i]] =  validation.winnerVotesPlus[winners[i]].add(1);
            else
                validation.winnerVotesMinus[winners[i]] =  validation.winnerVotesMinus[winners[i]].add(1);

            votes[msg.sender][validationHash ]  = true;
            emit WinnerVoted(msg.sender, winners[i], vote[i]);
        }

        validation.winnerConfirmations++;
        uint256 operatorCount = returnValidatorCount(validationHash);
        uint256 currentQuorum = validation.winnerConfirmations * 100 / operatorCount;
        
        if (currentQuorum >= members.requiredQuorum() && validation.winner == address(0)){
            address winner = validationHelpers.selectWinner(validationHash, winners);
            validation.winner = winner;
            processPayments(validationHash, winner);
            queue.removeFromQueue(validationHash);
        }
    }


    function returnValidatorList(bytes32 validationHash) public view virtual returns (address[] memory);

    function returnValidatorCount(bytes32 validatoinHash) public virtual returns(uint256);
    
    

    /**
     * @dev Review the validation results
     * @param validationHash - consist of hash of hashed document and timestamp
     * @return array  of validators
     * @return array of stakes of each validatoralidation.requestor
     * @return array of validation choices for each validator
     */
    function collectValidationResults(bytes32 validationHash)
        public
        view
        returns (
            address[] memory,
            uint256[] memory,
            uint256[] memory,
            uint256[] memory,
            string[] memory,
            bytes32[] memory
        )
    {
        uint256 j=0;
        Validation storage validation = validations[validationHash];

        address[] memory validatorsList = returnValidatorList(validationHash);
        address[] memory validatorListActive = new address[](validation.validationsCompleted);
        uint256[] memory stake = new uint256[](validation.validationsCompleted);
        uint256[] memory validatorsValues = new uint256[](validation.validationsCompleted);
        uint256[] memory validationTime = new uint256[] (validation.validationsCompleted);
        string[] memory validationUrl = new string[] (validation.validationsCompleted);
        bytes32[] memory reportHash = new bytes32[]  (validation.validationsCompleted);



        for (uint256 i = 0; i < validatorsList.length; i++) {
            if(validation.validatorChoice[validatorsList[i]] != ValidationStatus.Undefined) {
                stake[j] = memberHelpers.returnDepositAmount(validatorsList[i]);
                validatorsValues[j] = uint256(validation.validatorChoice[validatorsList[i]]);
                validationTime[j] = validation.validatorTime[validatorsList[i]];
                validationUrl[j] = validation.validationUrl[validatorsList[i]];
                validatorListActive[j] = validatorsList[i];
                reportHash[j] = validation.validationHash[validatorsList[i]];
                j++;
            }
        }
        return (validatorListActive, stake, validatorsValues, validationTime, validationUrl, reportHash);
    }

    /**
     * @dev validators can check if specific document has been already validated by them
     * @param validationHash - consist of hash of hashed document and timestamp
     * @return validation choices used by validator
     */
    function isValidated(bytes32 validationHash) public view returns (ValidationStatus){
        return validations[validationHash].validatorChoice[msg.sender];
    }

    function hasVoted(bytes32 validationHash) public view returns (bool) {

        return votes[msg.sender][validationHash];
    }
   
    function processPayments(bytes32 validationHash, address winner) internal virtual {
    }


    /**
     * @dev to mark validation as executed. This happens when participation level reached "requiredQuorum"
     * @param validationHash - consist of hash of hashed document and timestamp
     * @param documentHash hash of the document
     */
    function executeValidation(bytes32 validationHash, bytes32 documentHash, uint256 _quorum) internal nonReentrant {
       
        Validation storage validation = validations[validationHash];
        validation.executionTime = block.timestamp;

        (address[] memory winners, uint256 consensus) = validationHelpers.determineWinners(validationHash);
        validation.consensus = consensus;
        // (,uint256[] memory totalStake,,,,) =  collectValidationResults(validationHash);
        recentTimestamp = validation.validationTime;
        recentValidationHash = validationHash;
        queue.setValidatedFlag(validationHash);
        
        emit RequestExecuted( uint256(validation.auditType), validation.requestor, validationHash, documentHash, consensus, _quorum, block.timestamp, validation.url, winners);
        
    }


    /**
     * @dev called by validator to approve or disapprove this validation
     * @param documentHash - hash of validated document
     * @param validationTime - this is the time when validation has been initialized
     * @param decision - one of the ValidationStatus choices cast by validator
     */
    function validate(bytes32 documentHash, uint256 validationTime, address subscriber, ValidationStatus decision, string memory valUrl, bytes32 reportHash) public virtual {

        bytes32 validationHash = keccak256(abi.encodePacked(documentHash, validationTime, subscriber));
        Validation storage validation = validations[validationHash];
        require(members.userMap(msg.sender, Members.UserType(1)), "Validation:validate - Validator is not authorized.");
        require(validation.validationTime == validationTime, "Validation:validate - the validation params don't match.");
        require(validation.validatorChoice[msg.sender] == ValidationStatus.Undefined, "Validation:validate - This document has been validated already.");
        require(nodeOperations.returnDelegatorLink(msg.sender) == address(0x0), "Validations:validate - you can't validated because you have delegated your stake");
        require(nodeOperations.isNodeOperator(msg.sender), "Validations:validate - you are not a node operator");
        validation.validatorChoice[msg.sender] = decision;
        validation.validatorTime[msg.sender] = block.timestamp;
        validation.validationUrl[msg.sender] = valUrl;
        validation.validationHash[msg.sender] = reportHash;

        validation.validationsCompleted ++;

        nodeOperations.increaseStakeRewards(msg.sender);
        nodeOperations.increaseDelegatedStakeRewards(msg.sender);

        uint256 stakeAmt = memberHelpers.returnDepositAmount(msg.sender);
        updateQuorum(validationHash, stakeAmt, validation.validationTime);
        emit ValidatorValidated(msg.sender, documentHash, validation.validatorTime[msg.sender], decision, valUrl);

        if (recentTimestamp > 0 && validation.executionTime == 0) // this is not first transactoin and there3 was no execution
            quorum = (activeOperatorsStake[validationTime][validationHash] * 100).div(activeOperatorsStake[recentTimestamp][recentValidationHash]);
        
        if ((quorum >= members.requiredQuorum() || quorum == 100) && validation.executionTime == 0 )      // first transaction quorum is 100% for first validator
            executeValidation(validationHash, documentHash, quorum);
        

    }



    function returnValidationRecord(bytes32 validationHash) public  view
    returns( bool cohort,
            address requestor,
            uint256 validationTime,
            uint256 executionTime,
            string memory url,
            uint256 consensus,
            uint256 validationsCompleted,
            uint64 winnerConfirmations,
            bool paymentSent,
            address winner) {



        Validation storage validation = validations[validationHash];

        cohort = validation.cohort;
        requestor = validation.requestor;
        validationTime = validation.validationTime;
        executionTime = validation.executionTime;
        url = validation.url;
        consensus = validation.consensus;
        validationsCompleted = validation.validationsCompleted;
        winnerConfirmations = validation.winnerConfirmations;
        winner = validation.winner;
        paymentSent = winner != address(0);

    }


   function returnValidationUrl(bytes32 validationHash, address user) public  view returns(string memory url) {

        Validation storage validation = validations[validationHash];
        url = validation.validationUrl[user];

    }

     function returnWinnerPoints(bytes32 validationHash, address user) public  view returns(uint256 plus, uint256 minus) {

        Validation storage validation = validations[validationHash];
        plus = validation.winnerVotesPlus[user];
        minus = validation.winnerVotesMinus[user];

    }
   
}
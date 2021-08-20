// SPDX-License-Identifier: MIT
pragma solidity =0.8.0;

import "../AuditToken.sol";
import "./Members.sol";
import "./DepositModifiers.sol";
import "./CohortFactory.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";


/**
 * @title NoCohort
 * Allows on validation without cohort requested by data subscribers. 
 */
abstract contract Validations is AccessControl, ReentrancyGuard{
    using SafeMath for uint256;
    using SafeERC20 for AuditToken;
    uint256 public requiredQuorum = 60;
    AuditToken public auditToken;
    Members public members;
    MemberHelpers public memberHelpers;
    DepositModifiers public depositModifiers;
    CohortFactory public cohortFactory;
    mapping(address => uint256) public outstandingValidations;

    bytes32 public constant SETTER_ROLE = keccak256("SETTER_ROLE");
  
    /// @dev check if caller is a setter
    modifier isSetter {
        require(hasRole(SETTER_ROLE, msg.sender),
            "NoCohort:isSetter - Caller is not a setter"
        );
        _;
    }

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
    }

    mapping(bytes32 => Validation) public validations; // track each validation

    event ValidationInitialized(address indexed user, bytes32 validationHash, uint256 initTime, bytes32 documentHash, string url, AuditTypes indexed auditType);
    event ValidatorValidated(address validator, bytes32 indexed documentHash, uint256 validationTime, ValidationStatus decision);
    event RequestExecuted(uint256 indexed audits, address indexed requestor, bytes32 validationHash, bytes32 documentHash, uint256 consensus, uint256 quorum,  uint256 timeExecuted, string url);
    event PaymentProcessed(bytes32 validationHash, address[] validators);
    event Winners(address[] winners);

    constructor(address _auditToken, address _members, address _memberHelpers, address _cohortFactory, address _depositModifiers) {

        auditToken = AuditToken(_auditToken);
        members = Members(_members);
        memberHelpers = MemberHelpers(_memberHelpers);
        cohortFactory = CohortFactory(_cohortFactory);
        depositModifiers = DepositModifiers(_depositModifiers);
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);

    }

    /**
     * @dev to be called by governance to update new amount for required quorum
     * @param _requiredQuorum new value of required quorum
     */
    function updateQuorum(uint256 _requiredQuorum) public isSetter() {
        require(_requiredQuorum != 0, "New quorum value can't be 0");
        requiredQuorum = _requiredQuorum;
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
    function initializeValidation(bytes32 documentHash, string memory url, AuditTypes auditType, bool isCohort) public virtual {
        require(documentHash.length > 0, "NoCohort:initializeValidation - Document hash value can't be 0");

        uint256 validationTime = block.timestamp;
        bytes32 validationHash = keccak256(abi.encodePacked(documentHash, validationTime));

        outstandingValidations[msg.sender]++;
        Validation storage newValidation = validations[validationHash];
        // validations[validationHash].requestor =  msg.sender;

        newValidation.url = url; 
        newValidation.validationTime = validationTime;
        newValidation.requestor = msg.sender;
        newValidation.auditType = auditType;
        newValidation.cohort = isCohort;

        emit ValidationInitialized(msg.sender, validationHash, validationTime, documentHash, url, auditType);
    }

    function returnValidatorList(bytes32 validationHash) internal view virtual returns (address[] memory);
    

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
            ValidationStatus[] memory,
            uint256[] memory
        )
    {
        uint256 j=0;
        Validation storage validation = validations[validationHash];

        address[] memory validatorsList = returnValidatorList(validationHash);
        address[] memory validatorListActive = new address[](validation.validationsCompleted);
        uint256[] memory stake = new uint256[](validation.validationsCompleted);
        ValidationStatus[] memory validatorsValues = new ValidationStatus[](validation.validationsCompleted);
        uint256[] memory validationTime = new uint256[] (validation.validationsCompleted);


        for (uint256 i = 0; i < validatorsList.length; i++) {
            if(validation.validatorChoice[validatorsList[i]] != ValidationStatus.Undefined) {
                stake[j] = memberHelpers.returnDepositAmount(validatorsList[i]);
                validatorsValues[j] = validation.validatorChoice[validatorsList[i]];
                validationTime[j] = validation.validatorTime[validatorsList[i]];
                validatorListActive[j] = validatorsList[i];
                j++;
            }
        }
        return (validatorListActive, stake, validatorsValues, validationTime);
    }

    /**
     * @dev validators can check if specific document has been already validated by them
     * @param validationHash - consist of hash of hashed document and timestamp
     * @return validation choices used by validator
     */
    function isValidated(bytes32 validationHash) public view returns (ValidationStatus){
        return validations[validationHash].validatorChoice[msg.sender];
    }

    /**
     * @dev to calculate state of the quorum for the validation
     * @param validationHash - consist of hash of hashed document and timestamp
     * @return number representing current participation level in percentage
     */
    function calculateVoteQuorum(bytes32 validationHash)public view returns (uint256)
    {
        uint256 totalStaked;
        uint256 currentlyVoted;

        address[] memory validatorsList = returnValidatorList(validationHash);

        Validation storage validation = validations[validationHash];
        require(validation.validationTime > 0, "Cohort:calculateVoteQuorum - Validation hash doesn't exist");

        for (uint256 i = 0; i < validatorsList.length; i++) {
            totalStaked += memberHelpers.returnDepositAmount(validatorsList[i]);
            if (validation.validatorChoice[validatorsList[i]] != ValidationStatus.Undefined) 
                currentlyVoted += memberHelpers.returnDepositAmount(validatorsList[i]);
        }
        if (currentlyVoted == 0)
            return 0;
        else
           return (currentlyVoted * 100).div(totalStaked);
    }

    function determineConsensus(ValidationStatus[] memory validation) public pure returns(uint256 ) {

        uint256 yes;
        uint256 no;

        for (uint256 i=0; i< validation.length; i++) {

            if (validation[i] == ValidationStatus.Yes)
                yes++;
            else
                no++;
        }

        if (yes > no)
            return 1; // consensus is to approve
        else if (no > yes)
            return 2; // consensus is to disapprove
        else
            return 2; // consensus is tie - should not happen
    }

    function processPayments(bytes32 validationHash, address[] memory validators) internal virtual {
    }

    function processRewards(bytes32 validationHash, address[] memory validators, uint256[] memory stake) internal virtual {

    }

    /**
     * @dev to mark validation as executed. This happens when participation level reached "requiredQuorum"
     * @param validationHash - consist of hash of hashed document and timestamp
     * @param documentHash hash of the document
     * @param executeValidationTime time of the completion of validation
     */
    function executeValidation(bytes32 validationHash, bytes32 documentHash, uint256 executeValidationTime) internal nonReentrant {
        uint256 quorum = calculateVoteQuorum(validationHash);
        if (quorum >= requiredQuorum && executeValidationTime == 0) {
            Validation storage validation = validations[validationHash];
            validation.executionTime = block.timestamp;

            (address[] memory winners, uint256 consensus) = determineWinners(validationHash);
            validation.consensus = consensus;
            
            emit RequestExecuted( uint256(validation.auditType), validation.requestor, validationHash, documentHash, consensus, quorum, block.timestamp, validation.url);
            processPayments(validationHash, winners);
        }
    }


    function insertionSort(bytes32 validationHash) internal view returns (address[] memory, ValidationStatus[] memory, uint256[] memory) {

        (address[] memory validator, ,ValidationStatus[] memory status, uint256[] memory validationTimes) =  collectValidationResults(validationHash);

        uint length = validationTimes.length;
        
        for (uint i = 1; i < length; i++) {
            
            uint key = validationTimes[i];
            address user = validator[i];
            ValidationStatus choice = status[i];
            uint j = i - 1;
            while ((int(j) > 0) && (validationTimes[j] > key)) {
                validationTimes[i] = validationTimes[j];
                validationTimes[i-1] = key; 
                validator[i] = validator[j];
                validator[i-1] = user;
                status[i] = status[j];
                status[i-1] =  choice; 
                j--;
            }
            validationTimes[j + 1] = key;
            validator[j+1] = user;
            status[j+1] = choice;
        }

        return (validator, status, validationTimes );
    }


    function determineWinners(bytes32 validationHash) public view returns (address[] memory, uint256){

        (address[] memory validator, ValidationStatus[] memory status, uint256[] memory validationTimes) = insertionSort (validationHash);

        uint256 consensus = determineConsensus(status);
        bool[] memory isWinner = new bool[](validator.length);
        bool done;
        uint256 i=0;
        uint256 topValidationTime = validationTimes[0];
        uint256 numFound=0;
        
        while (!done) {
            if (uint256(status[i]) == consensus && validationTimes[i] == topValidationTime){
                isWinner[i] = true;
                numFound ++;
            } 
         
            if (i + 1 == validator.length)
                done = true;
            else
                i++;
          }
        
        address[] memory winners = new address[](numFound);
        uint256 j;

        for (uint256 k = 0; k< validator.length; k++){

            if (isWinner[k]){
                winners[j] = validator[k];
                j++;
            }
        }
        return (winners, consensus);
    }

    /**
     * @dev called by validator to approve or disapprove this validation
     * @param documentHash - hash of validated document
     * @param validationTime - this is the time when validation has been initialized
     * @param decision - one of the ValidationStatus choices cast by validator
     */
        function validate(bytes32 documentHash, uint256 validationTime, ValidationStatus decision) public virtual {

        bytes32 validationHash = keccak256(abi.encodePacked(documentHash, validationTime));
        Validation storage validation = validations[validationHash];
        require(members.userMap(msg.sender, Members.UserType(1)), "Cohort:validate - Validator is not authorized.");
        require(validation.validationTime == validationTime, "Cohort:validate - the validation params don't match.");
        require(validation.validatorChoice[msg.sender] ==ValidationStatus.Undefined, "Cohort:validate - This document has been validated already.");
        validation.validatorChoice[msg.sender] = decision;
        validation.validatorTime[msg.sender] = block.timestamp;
        validation.validationsCompleted ++;

        memberHelpers.increaseStakeRewards(msg.sender);

        if (validation.executionTime == 0 )
            executeValidation(validationHash, documentHash, validation.executionTime);
        emit ValidatorValidated(msg.sender, documentHash, validationTime, decision);
    }

    function isHashAndTimeCorrect( bytes32 documentHash, uint256 validationTime) public view returns (bool){

        bytes32 validationHash = keccak256(abi.encodePacked(documentHash, validationTime));
        Validation storage validation = validations[validationHash];
        if (validation.validationTime == validationTime)
            return true;
        else
            return false;
    }
}
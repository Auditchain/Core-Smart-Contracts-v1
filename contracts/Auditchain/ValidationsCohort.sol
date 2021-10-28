// SPDX-License-Identifier: MIT
pragma solidity =0.8.0;

import "./Validations.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";


contract ValidationsCohort is Validations {
    using SafeMath for uint256;

    constructor(address _members, address _memberHelpers, address _cohortFactory, address _depositModifiers, address _nodeOperations, address _validationHelpers) 
        Validations(_members, _memberHelpers, _cohortFactory, _depositModifiers, _nodeOperations, _validationHelpers){

    }


    /**
    * @dev to be called by Enterprise to initiate new validation
    * @param documentHash - hash of unique identifier of validated transaction
    * @param url - locatoin of the file on IPFS or other decentralized file storage
    * @param auditType - type of auditing 
    */
    function initializeValidationCohort(bytes32 documentHash, string memory url, AuditTypes auditType) public {

        require(checkIfRequestorHasFunds(msg.sender), "NoCohort:initializeValidation - Not sufficient funds. Deposit additional funds.");
        require(cohortFactory.cohortMap(msg.sender, uint256(auditType)), "Cohort:intializeValidation - Only enterprise owing this cohort can call this function");
        super.initializeValidation(documentHash, url, auditType, true);
        
    }


   /**
   * @dev verify if requesting party has sufficient funds
   * @param requestor a user whos funds are checked
   * @return true or false 
   */
   function checkIfRequestorHasFunds(address requestor) public override view returns (bool) {

       if (outstandingValidations[requestor] > 0 )
        return ( memberHelpers.deposits(requestor) > members.amountTokensPerValidation()
                    .mul(outstandingValidations[requestor])
                    .mul(members.enterpriseMatch())
                    .div(1e2));
        else if (memberHelpers.deposits(requestor) == 0)
            return false;
        else
            return true;
    }


    function processPayments(bytes32 validationHash, address winner) internal override {

        Validation storage validation = validations[validationHash];
        outstandingValidations[validation.requestor] = outstandingValidations[validation.requestor].sub(1);
        depositModifiers.processPayment(winner, validation.requestor, validationHash);
        emit PaymentProcessed(validationHash, winner, validation.winnerVotesPlus[winner], validation.winnerVotesMinus[winner]);
    }

    function returnValidatorList(bytes32 validationHash) public view override returns (address[] memory){

        Validation storage validation = validations[validationHash];
        address[] memory validatorsList = cohortFactory.returnValidatorList(validation.requestor, uint256(validation.auditType));
        return validatorsList;
    }



     function validate(bytes32 documentHash, uint256 validationTime, address subscriber, ValidationStatus decision, string memory valUrl, bytes32 reportHash) public override {

        bytes32 validationHash = keccak256(abi.encodePacked(documentHash, validationTime, subscriber));
        Validation storage validation = validations[validationHash];
        (bool ivited, bool accepted) = cohortFactory.isValidatorInvited(validation.requestor, msg.sender, uint256(validation.auditType));
        require(ivited && accepted, "Cohort:validate - Validator is not part of the cohort or document Hash is invalid.");

        super.validate(documentHash, validationTime, subscriber, decision, valUrl, reportHash);
        
    }

     function returnValidatorCount() public pure override returns (uint256){
        return 4;
    }




}
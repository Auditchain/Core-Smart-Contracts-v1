// SPDX-License-Identifier: MIT
pragma solidity =0.8.0;

import "./Validations.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";


contract ValidationsCohort is Validations {
    using SafeMath for uint256;

    constructor(address _members, address _memberHelpers, address _cohortFactory, address _depositModifiers, address _nodeOperations) 
        Validations(_members, _memberHelpers, _cohortFactory, _depositModifiers, _nodeOperations){

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


    function processPayments(bytes32 validationHash, address[] memory validators) internal override {

        Validation storage validation = validations[validationHash];
        outstandingValidations[validation.requestor] = outstandingValidations[validation.requestor].sub(1);
        depositModifiers.processPayment(validators, validation.requestor, validationHash);
        emit PaymentProcessed(validationHash, validators);
        
    }

    function returnValidatorList(bytes32 validationHash) internal view override returns (address[] memory){

        Validation storage validation = validations[validationHash];
        address[] memory validatorsList = cohortFactory.returnValidatorList(validation.requestor, uint256(validation.auditType));
        return validatorsList;
    }



     function validate(bytes32 documentHash, uint256 validationTime, ValidationStatus decision, string memory valUrl) public override {

        bytes32 validationHash = keccak256(abi.encodePacked(documentHash, validationTime));
        Validation storage validation = validations[validationHash];
        (bool ivited, bool accepted) = cohortFactory.isValidatorInvited(validation.requestor, msg.sender, uint256(validation.auditType));
        require(ivited && accepted, "Cohort:validate - Validator is not part of the cohort or document Hash is invalid.");

        super.validate(documentHash, validationTime, decision, valUrl);
        
    }



}
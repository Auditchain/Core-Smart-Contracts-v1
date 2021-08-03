// SPDX-License-Identifier: MIT
pragma solidity =0.8.0;

import "./Validations.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";


contract ValidationsNoCohort is Validations {
    using SafeMath for uint256;

    constructor(address _auditToken, address _members, address _memberHelpers, address _cohortFactory) 
        Validations(_auditToken, _members, _memberHelpers, _cohortFactory){

    }

    /**
    * @dev to be called by Enterprise to initiate new validation
    * @param documentHash - hash of unique identifier of validated transaction
    * @param url - locatoin of the file on IPFS or other decentralized file storage
    * @param auditType - type of auditing 
    */
    function initializeValidation(bytes32 documentHash, string memory url, AuditTypes auditType, bool isCohort) public override {

        require(checkIfRequestorHasFunds(msg.sender), "NoCohort:initializeValidation - Not sufficient funds. Deposit additional funds.");
        require(members.userMap(msg.sender, Members.UserType(2)), "MemberHelpers:dataSubscriberPayment - You have to register as data subscriber");
        super.initializeValidation(documentHash, url, auditType, isCohort);
        
    }

   /**
   * @dev verify if requesting party has sufficient funds
   * @param requestor a user whos funds are checked
   * @return true or false 
   */
      function checkIfRequestorHasFunds(address requestor) public override view returns (bool) {
       if (outstandingValidations[requestor] > 0 )
          return ( memberHelpers.deposits(requestor) > memberHelpers.nonCohortValidationFee().mul(outstandingValidations[requestor]));
       else 
          return true;
    }


    function processPayments(bytes32 validationHash, address[] memory validators) internal override{

        Validation storage validation = validations[validationHash];
        outstandingValidations[validation.requestor] = outstandingValidations[validation.requestor].sub(1);
        memberHelpers.processNonChortPayment(validators, validation.requestor);
        emit PaymentProcessed(validationHash, validators);
        
    }

    function returnValidatorList(bytes32 validationHash) internal view override  returns (address[] memory){

        address[] memory validatorsList = members.returnValidatorList();
        return validatorsList;
    }

    function validate(bytes32 documentHash, uint256 validationTime, ValidationStatus decision) public override {
        super.validate(documentHash, validationTime, decision);
    }



}
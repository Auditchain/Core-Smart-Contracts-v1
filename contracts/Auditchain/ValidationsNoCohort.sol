// SPDX-License-Identifier: MIT
pragma solidity =0.8.0;

import "./Validations.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";


contract ValidationsNoCohort is Validations {
    using SafeMath for uint256;

    constructor(address _members, address _memberHelpers, address _cohortFactory, address _depositModifiers, address _nodeOperations, address _validationHelpers) 
        Validations(_members, _memberHelpers, _cohortFactory, _depositModifiers, _nodeOperations, _validationHelpers){

    }

    /**
    * @dev to be called by data subscriber to initiate new validation
    * @param documentHash - hash of unique identifier of validated transaction
    * @param url - locatoin of the file on IPFS or   function returnValidatorList(bytes32 validationHash) public view override  returns (address[] memory){
    * @param auditType - type of auditing 
    */
    function initializeValidationNoCohort(bytes32 documentHash, string memory url, AuditTypes auditType) public {

        require(checkIfRequestorHasFunds(msg.sender), "ValidationsNoCohort:initializeValidationNoCohort - Not sufficient funds. Deposit additional funds.");
        require(members.userMap(msg.sender, Members.UserType(2)), "ValidationsNoCohort:initializeValidationNoCohort - You have to register as data subscriber");
        super.initializeValidation(documentHash, url, auditType, false);
        
    }

   /**
   * @dev verify if requesting party has sufficient funds
   * @param requestor a user whos funds are checked
   * @return true or false 
   */
      function checkIfRequestorHasFunds(address requestor) public override view returns (bool) {
       if (outstandingValidations[requestor] > 0 )
          return ( memberHelpers.deposits(requestor) > nodeOperations.POWFee().mul(outstandingValidations[requestor]));
       else 
          return true;
    }


    function processPayments(bytes32 validationHash, address winner) internal override { 

        Validation storage validation = validations[validationHash];
        outstandingValidations[validation.requestor] = outstandingValidations[validation.requestor].sub(1);
        depositModifiers.processNonChortPayment(winner, validation.requestor, validationHash);
        emit PaymentProcessed(validationHash, winner, validation.winnerVotesPlus[winner], validation.winnerVotesMinus[winner]);
    }

    function validate(bytes32 documentHash, uint256 validationTime, address subscriber, ValidationStatus decision, string memory valUrl, bytes32 reportHash) public override {
        super.validate(documentHash, validationTime, subscriber, decision, valUrl, reportHash);
    }

    function returnValidatorCount(bytes32 valHash) public view override returns (uint256){
        // return nodeOperations.returnNodeOperatorsCount();

        (address[] memory nodeOperators,,,,,) = collectValidationResults(recentValidationHash);
        return nodeOperators.length;
        
    }

    function returnValidatorList(bytes32 validationHash) public view override  returns (address[] memory){

        address[] memory validatorsList = nodeOperations.returnNodeOperators();
        return validatorsList;
    }


}
// SPDX-License-Identifier: MIT
pragma solidity =0.7.6;
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./Cohort.sol";
import "./Members.sol";

/**
 * @title CohortCreation
 * @dev AccessControl 

 */

contract CreateCohort is  AccessControl {

    // Audit types to be used. Three types added for future expansion 
    enum AuditTypes {
        Financial,
        System,
        Contract,
        Type4,
        Type5,
        Type6
    }

    

    Members public members;                                            // pointer to Members contract
    mapping (address => address[]) public validatorCohortList;  // list of validators
    address public auditToken;                                  // AUDT token contract

    event CohortCreatedFinal(address indexed enterprise, address indexed cohort, AuditTypes audits);
    bytes32 public constant CONTROLLER_ROLE = keccak256("CONTROLLER_ROLE");  


 /**
    * @dev Used to determine cohorts in which validator is included
    * @param validator address of the validator
    */
    function returnValidatorCohortsCount(address validator) public view returns (uint256){
        return validatorCohortList[validator].length;
    }


    constructor(Members _members, address _auditTokenAddress ) {
        members = Members(_members);
        auditToken = _auditTokenAddress;
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender); // 
    }
   

    /**
    * @dev create a list of validators to be initialized in new cohort   
    * @param validators any array of address of the validators
    * @param cohort in which the validators should be initialized     
    */
    function createValidatorCohortList(address[] memory validators, address cohort) internal {

        for (uint256 i=0; i< validators.length; i++){
            validatorCohortList[validators[i]].push(cohort);
        }
    }

    /**
    * @dev creates a new cohort using create2 methods based on the audit type
    * it is called from cohortFactory. 
    * @param audit type
    */
    function createCohort(uint256 audit,  address[] memory validatorsList, address enterprise ) public returns(address) {

        require(hasRole(CONTROLLER_ROLE, msg.sender), "CreateCohort:createCohort - Caller is not a controller");

        bytes memory bytecode = type(Cohort).creationCode;        
        bytes32 salt = keccak256(abi.encodePacked(enterprise, audit));


        address cohortAddress;           
        assembly {
            cohortAddress := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        createValidatorCohortList(validatorsList, cohortAddress);
        Cohort(cohortAddress).initialize(auditToken, members, enterprise, validatorsList, uint256(audit));
    
        emit CohortCreatedFinal(enterprise, cohortAddress, AuditTypes(audit));
        return cohortAddress;
    } 
}
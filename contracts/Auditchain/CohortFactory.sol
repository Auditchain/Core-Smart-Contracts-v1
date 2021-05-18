// SPDX-License-Identifier: MIT
pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./Members.sol";
import "./CreateCohort.sol";

/**
 * @title CohortFactory
 * Allows on creation of invitations by Enterprise and acceptance of Validators of those 
 * invitations. Finally Enterprise can create cohort consisting of invited Validators
 * and Enterprise. 
 */

contract CohortFactory is  AccessControl {

    // Audit types to be used. Two types added for future expansion 
    enum AuditTypes {
        Financial, System, Rules, NFT, Type5, Type6
    }

    uint256[] public minValidatorPerCohort = [3,3,3,3,3,3];

    // Invitation structure to hold info about its status
    struct Invitation {
        // address enterprise;
        address validator;
        uint256 invitationDate;      
        uint256 acceptanceDate;
        AuditTypes audits;
        address cohort;
        bool deleted;
    }

    struct Cohorts {
        address cohort;
        AuditTypes audits;
    }

    mapping(address => Cohorts[]) public cohortList;
    mapping(address => uint256) public cohortMap;

    Members members;                                            // pointer to Members contract1 
    mapping (address =>  Invitation[]) public invitations;      // invitations list
    address platformAddress;                                    // address to deposit platform fees
    address createCohortAddress;

    bytes32 public constant SETTER_ROLE =  keccak256("SETTER_ROLE");

    event ValidatorInvited(address  inviting, address indexed invitee, AuditTypes audits, uint256 invitationNumber, address cohort);
    event InvitationAccepted(address indexed validator, uint256 invitationNumber);
    event CohortCreated(address indexed enterprise, address cohort, AuditTypes audits);
    event UpdateMinValidatorsPerCohort(uint256 minValidatorPerCohort, AuditTypes audits);
    event ValidatorCleared(address validator, AuditTypes audit, address cohort, address enterprise);

    /// @dev check if caller is a setter     
    modifier isSetter {
        require(hasRole(SETTER_ROLE, msg.sender), "Members:isSetter - Caller is not a setter");

        _;
    }

    constructor(Members _members,  address _createCohortAddress ) {
        members = _members;
        createCohortAddress = _createCohortAddress;
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender); // 
    }
   
    /**
    * @dev to be called by Governance contract to update new value for min validators per cohort
    * @param _minValidatorPerCohort new value 
    * @param audits type of validations
    */
    function updateMinValidatorsPerCohort(uint256 _minValidatorPerCohort, uint256 audits) public  {

        require(_minValidatorPerCohort != 0, "CreateCohort:updateMinValidatorsPerCohort - New value for the  min validator per cohort can't be 0");
        require(audits <= 5 && audits >=0 , "Cohort Factory:updateMinValidatorsPerCohort - Audit type has to be <= 5 and >=0");
        minValidatorPerCohort[audits] = _minValidatorPerCohort;
        emit UpdateMinValidatorsPerCohort(_minValidatorPerCohort, AuditTypes(audits));
    }

    /**
    * @dev Used by Enterprise to invite validator
    * @param validator address of the validator to invite
    * @param audit type of the audit
    */
    function inviteValidator(address validator, AuditTypes audit, address cohort) public {

        Invitation memory newInvitation;
        bool isValidator = members.userMap(validator, Members.UserType(1));
        bool isEnterprise = members.userMap(msg.sender, Members.UserType(0));
        (bool invited, ) = isValidatorInvited(msg.sender, validator, audit);
        require( !invited , "CohortFactory:inviteValidator - This validator has been already invited for this validation type." );
        require( isEnterprise, "CohortFactory:inviteValidator - Only Enterprise user can invite Validators.");
        require( isValidator, "CohortFactory:inviteValidator - Only Approved Validators can be invited.");
        require( members.deposits(validator) > 0,"CohortFactory:inviteValidator - This validator has not staked any tokens yet.");
        newInvitation.validator = validator;
        newInvitation.invitationDate = block.timestamp;     
        newInvitation.audits = audit;   
        newInvitation.cohort = cohort;
        invitations[msg.sender].push(newInvitation);
       
        emit ValidatorInvited(msg.sender, validator, audit, invitations[msg.sender].length - 1, cohort);
    }

    /**
    * @dev Used by Enterprise to invite multiple validators in one call 
    * @param validator address of the validator to invite
    * @param audit type of the audit
    */
    function inviteValidatorMultiple(address[] memory validator, AuditTypes audit, address cohort) public{

        uint256 length = validator.length;
        require(length <= 256, "CohortFactory-inviteValidatorMultiple: List too long");
        for (uint256 i = 0; i < length; i++) {
            inviteValidator(validator[i], audit, cohort);
        }
    }

    /**
    * @dev Used by Validator to accept Enterprise invitation
    * @param enterprise address of the Enterprise who created invitation
    * @param invitationNumber invitation number
    */
    function acceptInvitation(address enterprise, uint256 invitationNumber) public {

        require( invitations[enterprise].length > invitationNumber, "CohortFactory:acceptInvitation - This invitation doesn't exist");
        require( invitations[enterprise][invitationNumber].acceptanceDate == 0, "CohortFactory:acceptInvitation- This invitation has been accepted already .");
        require( invitations[enterprise][invitationNumber].validator == msg.sender, "CohortFactory:acceptInvitation - You are accepting invitation to which you were not invited or this invitation doesn't exist.");
        invitations[enterprise][invitationNumber].acceptanceDate = block.timestamp;

            if (invitations[enterprise][invitationNumber].cohort != address(0)) // adding validator to existing cohort
                require(
                    ICohort(invitations[enterprise][invitationNumber].cohort)
                    .addAdditionalValidator(msg.sender), 
                    "CohortFactory:inviteValidator - Problem adding new validator"
                    );

        emit InvitationAccepted(msg.sender, invitationNumber);
    }

    /**
    * @dev Used by Enterprise to remove existing validator
    * @param validator validator to remove
    * @param audit type of audit 
    * @param cohort cohort from which validator is removed
    */
    function clearInvitationRemoveValidator(address validator, AuditTypes audit, address cohort) public {

        for (uint256 i = 0; i < invitations[msg.sender].length; i++){
            if (invitations[msg.sender][i].audits == audit && 
                invitations[msg.sender][i].validator ==  validator){
                invitations[msg.sender][i].deleted = true;
                require(ICohort(cohort).removeValidator(validator, msg.sender), 
                        "CohortFactory:clearInvitationValidator - Problem removing validator in Cohort contract");
                emit ValidatorCleared(validator, audit, cohort, msg.sender);
            }
        }
    }

    function clearInvitationRemoveValidator(address validator, AuditTypes audit) public {

        for (uint256 i = 0; i < invitations[msg.sender].length; i++){
            if (invitations[msg.sender][i].audits == audit && 
                invitations[msg.sender][i].validator ==  validator){
                invitations[msg.sender][i].deleted = true;                
                emit ValidatorCleared(validator, audit, address(0x0), msg.sender);
            }
        }
    }

    /**
    * @dev Used by Validator to accept multiple Enterprise invitation
    * @param enterprise address of the Enterprise who created invitation
    * @param invitationNumber invitation number
    */
    function acceptInvitationMultiple(address[] memory enterprise, uint256[] memory invitationNumber) public{

        uint256 length = enterprise.length;
        for (uint256 i = 0; i < length; i++) {
            acceptInvitation(enterprise[i], invitationNumber[i]);
        }
    }

    /**
    * @dev To return invitation count
    * @param enterprise address of the Enterprise who created invitation
    * @param audit type
    * @return count of invitations
    */
    function returnInvitationCount(address enterprise, AuditTypes audit) public view returns(uint256) {

        uint256 count;

        for (uint i=0; i < invitations[enterprise].length; ++i ){
            if (invitations[enterprise][i].audits == audit && 
                invitations[enterprise][i].acceptanceDate != 0 &&
                !invitations[enterprise][i].deleted)
                count ++;
        }
        return count;
    }

    /**
    * @dev Used to determine if validator has been invited and/or if validation has been accepted
    * @param enterprise inviting party
    * @param validator address of the validator
    * @param audits types
    * @return true if invited
    * @return true if accepted invitation
    */
    function isValidatorInvited(address enterprise, address validator, AuditTypes audits) public view returns (bool, bool) {

        for (uint i=0; i < invitations[enterprise].length; ++i ){
            if (invitations[enterprise][i].audits == audits && 
                invitations[enterprise][i].validator == validator &&
                !invitations[enterprise][i].deleted){
                if (invitations[enterprise][i].acceptanceDate > 0)
                    return (true, true);
                return (true, false);
            }
        }
        return (false, false);
    }

     /**
    * @dev Used to return list of cohorts for enterprise
    * @param enterprise inviting party
    * @return cohort address 
    * @return audit type
    */
    function returnCohorts(address enterprise) public view returns (address[] memory, uint256[] memory){

        address[] memory cohort = new address[](cohortList[enterprise].length);
        uint256[] memory audits = new uint256[](cohortList[enterprise].length);

        for (uint256 i; i < cohortList[enterprise].length; i++){
            cohort[i] = cohortList[enterprise][i].cohort;
            audits[i] = uint256(cohortList[enterprise][i].audits);
        }
        return (cohort, audits);
    }

     /**
     * @dev Function to calculate outstanding validations for enterprise. 
     */   
    function returnOutstandingValidations() public view returns(uint256) {

         (address[] memory cohorts, ) = returnCohorts(msg.sender);
         uint totalOutstandingValidations;

         for (uint256 i; i< cohorts.length; i++)
             totalOutstandingValidations = totalOutstandingValidations + ICohort(cohorts[i]).outstandingValidations();

        return totalOutstandingValidations;
    }

    /**
    * @dev Initiate creation a new cohort using create2 methods based on the audit type and enterprise combination
    * @param audit type
    */
    function createCohort(AuditTypes audit) public {
        address[] memory validatorsList = new address[](returnInvitationCount(msg.sender, audit));
        uint k;
        for (uint i=0; i < invitations[msg.sender].length; ++i ){
            if (invitations[msg.sender][i].audits == audit && invitations[msg.sender][i].acceptanceDate > 0){
                validatorsList[k] = invitations[msg.sender][i].validator;
                k++;
            }
        }
        require(k >= minValidatorPerCohort[uint256(audit)], "CohortFactory:createCohort - Number of validators below required minimum.");

        address cohortAddress = CreateCohort(createCohortAddress).createCohort(uint256(audit),  validatorsList, msg.sender );
        cohortList[msg.sender].push();
        cohortList[msg.sender][cohortList[msg.sender].length - 1].cohort = cohortAddress;
        cohortList[msg.sender][cohortList[msg.sender].length - 1].audits = audit;

        cohortMap[cohortAddress] = uint256(audit);

        emit CohortCreated(msg.sender, cohortAddress, AuditTypes(audit));
        
    }
}

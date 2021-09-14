// SPDX-License-Identifier: MIT
pragma solidity =0.8.0;
pragma experimental ABIEncoderV2;
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./Members.sol";
import "./MemberHelpers.sol";

/**
 * @title CohortFactory
 * Allows on creation of invitations by Enterprise and acceptance of Validators of those 
 * invitations. Finally Enterprise can create cohort consisting of invited Validators
 * and Enterprise. 
 */

contract CohortFactory is  AccessControl {

    // Audit types to be used. Two types added for future expansion 
    enum AuditTypes {
        Unknown, Financial, System, NFT, Type4, Type5
    }

    uint256[] public minValidatorPerCohort = [0,3,3,3,3,3,3];

    // Invitation structure to hold info about its status
    struct Invitation {
        // address enterprise;
        address validator;
        uint256 invitationDate;      
        uint256 acceptanceDate;
        AuditTypes audits;
        // address cohort;
        bool deleted;
    }

    // struct Cohorts {
    //     AuditTypes audits;
    // }

    mapping(address => uint256[]) public cohortList;
    mapping(address => mapping(uint256=>bool)) public cohortMap;
    mapping (address => mapping(address=> AuditTypes[])) public validatorCohortList;  // list of validators
    

    Members members;                                            // pointer to Members contract1 
    MemberHelpers public memberHelpers;                                       
    mapping (address =>  Invitation[]) public invitations;      // invitations list
    address platformAddress;                                    // address to deposit platform fees


    event ValidatorInvited(address  inviting, address indexed invitee, AuditTypes indexed audits, uint256 invitationNumber);
    event InvitationAccepted(address indexed validator, uint256 invitationNumber);
    event CohortCreated(address indexed enterprise, uint256 audits);
    event UpdateMinValidatorsPerCohort(uint256 minValidatorPerCohort, AuditTypes audits);
    event ValidatorCleared(address validator, AuditTypes audit, address enterprise);



    constructor(Members _members, MemberHelpers _memberHelpers) {
        members = _members;
        memberHelpers = _memberHelpers;
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender); // 
    }
   
    /**
    * @dev to be called by Governance contract to update new value for min validators per cohort
    * @param _minValidatorPerCohort new value 
    * @param audits type of validations
    */
    function updateMinValidatorsPerCohort(uint256 _minValidatorPerCohort, uint256 audits) public  {

        require(_minValidatorPerCohort != 0, "CohortFactory:updateMinValidatorsPerCohort - New value for the  min validator per cohort can't be 0");
        require(audits <= 6 && audits >=0 , "Cohort Factory:updateMinValidatorsPerCohort - Audit type has to be <= 5 and >=0");
        minValidatorPerCohort[audits] = _minValidatorPerCohort;
        emit UpdateMinValidatorsPerCohort(_minValidatorPerCohort, AuditTypes(audits));
    }

    /**
    * @dev Used by Enterprise to invite validator
    * @param validator address of the validator to invite
    * @param audit type of the audit
    */
    function inviteValidator(address validator, uint256 audit) public {

        Invitation memory newInvitation;
        bool isValidator = members.userMap(validator, Members.UserType(1));
        bool isEnterprise = members.userMap(msg.sender, Members.UserType(0));
        (bool invited, ) = isValidatorInvited(msg.sender, validator, audit);
        require( !invited , "CohortFactory:inviteValidator - This validator has been already invited for this validation type." );
        require( isEnterprise, "CohortFactory:inviteValidator - Only Enterprise user can invite Validators.");
        require( isValidator, "CohortFactory:inviteValidator - Only Approved Validators can be invited.");
        require( memberHelpers.deposits(validator) > 0,"CohortFactory:inviteValidator - This validator has not staked any tokens yet.");
        newInvitation.validator = validator;
        newInvitation.invitationDate = block.timestamp;     
        newInvitation.audits = AuditTypes(audit);   
        invitations[msg.sender].push(newInvitation);
       
        emit ValidatorInvited(msg.sender, validator, AuditTypes(audit), invitations[msg.sender].length - 1);
    }
    

    /**
    * @dev Used by Enterprise to invite multiple validators in one call 
    * @param validator address of the validator to invite
    * @param audit type of the audit
    */
    function inviteValidatorMultiple(address[] memory validator, AuditTypes audit) public{

        uint256 length = validator.length;
        require(length <= 256, "CohortFactory-inviteValidatorMultiple: List too long");
        for (uint256 i = 0; i < length; i++) {
            inviteValidator(validator[i], uint256(audit));
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
          
        emit InvitationAccepted(msg.sender, invitationNumber);
    }


    function clearInvitationRemoveValidator(address validator, AuditTypes audit) public  returns (bool) {

        for (uint256 i = 0; i < invitations[msg.sender].length; i++){
            if (invitations[msg.sender][i].audits == audit && invitations[msg.sender][i].validator ==  validator){
                invitations[msg.sender][i].deleted = true;                
                emit ValidatorCleared(validator, audit, msg.sender);
                return true;
            }
        }


        revert("This invitation doesn't exist");
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
    function isValidatorInvited(address enterprise, address validator, uint256 audits) public view returns (bool, bool) {

        for (uint i=0; i < invitations[enterprise].length; ++i ){
            if (invitations[enterprise][i].audits == AuditTypes(audits) && 
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
    * @dev Used to determine if validator has been invited and/or if validation has been accepted
    * @param enterprise inviting party
    * @param validator address of the validator
    * @param audits types
    * @param invitNumber invitation number
    * @return true if invited
    * @return true if accepted invitation
    */
    function isValidatorInvitedNumber(address enterprise, address validator, uint256 audits, uint256 invitNumber) public view returns (bool, bool) {

        if (invitations[enterprise][invitNumber].audits == AuditTypes(audits) && 
            invitations[enterprise][invitNumber].validator == validator &&
            !invitations[enterprise][invitNumber].deleted){
            if (invitations[enterprise][invitNumber].acceptanceDate > 0)
                return (true, true);
            return (true, false);
        }
        return (false, false);
    }

     /**
    * @dev Returns true for audit types for which enterprise has created cohorts.
    * @param enterprise inviting party
    * @return list of boolean variables with value true for audit types enterprise has initiated cohort, 
    */
    function returnCohorts(address enterprise) public view returns (bool[] memory){

        uint256 auditCount = 6;
        bool[] memory audits = new bool[](auditCount);

        for (uint256 i; i < auditCount; i++){
            if (cohortMap[enterprise][i])
               audits[i] = true;
        }
        return (audits);
    }

    function returnValidatorList(address enterprise, uint256 audit)public view returns(address[] memory){

        address[] memory validatorsList = new address[](returnInvitationCount(enterprise, AuditTypes(audit)));
        uint k;
        for (uint i=0; i < invitations[enterprise].length; ++i ){
            if (invitations[enterprise][i].audits == AuditTypes(audit) && invitations[enterprise][i].acceptanceDate > 0){
                validatorsList[k] = invitations[enterprise][i].validator;
                k++;
            }
        }
        return validatorsList;
    }

     /**
    * @dev create a list of validators to be initialized in new cohort   
    * @param validators any array of address of the validators
    * @param enterprise who created cohort
    * @param audit  type of audit
    */
    function createValidatorCohortList(address[] memory validators, address enterprise, AuditTypes audit) internal {

        for (uint256 i=0; i< validators.length; i++){
            validatorCohortList[validators[i]][enterprise].push(audit);
        }
    }

    // function returnCohortsForDataSubscriber(address dataSubscriber)

   /**
    * @dev Used to determine cohorts count for given validator
    * @param validator address of the validator
    */ 
    function returnValidatorCohortsCount(address validator, address enterprise) public view returns (uint256){

        return validatorCohortList[validator][enterprise].length;
    }

    /**
    * @dev Initiate creation of a new cohort 
    * @param audit type
    */
    function createCohort(uint256 audit) public {
        require(!cohortMap[msg.sender][uint256(audit)] , "CohortFactory:createCohort - This cohort already exists.");
        address[] memory validators =  returnValidatorList(msg.sender, audit);
        require(validators.length >= minValidatorPerCohort[uint256(audit)], "CohortFactory:createCohort - Number of validators below required minimum.");
        cohortMap[msg.sender][uint256(audit)] = true;   
        createValidatorCohortList(validators, msg.sender, AuditTypes(audit));
        emit CohortCreated(msg.sender, audit);
        
    }
}

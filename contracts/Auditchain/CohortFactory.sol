// SPDX-License-Identifier: MIT
pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./Members.sol";
import "./CreateCohort.sol";

/**
 * @title CohortFactory
 * @dev AccessControl 
 * Allows on creation of invitations by Enterprise and acceptance of Validators of those 
 * invitations. Finally Enterprise can create cohort consisting of invited Validators
 * and enterprise. 
 */

contract CohortFactory is  AccessControl {

    // Audit types to be used. Three types added for future expansion 
    enum AuditTypes {
        Financial,
        System,
        Contract,
        Type4,
        Type5,
        Type6
    }

    // Invitation structure to hold info about its status
    struct Invitation {
        address enterprise;
        address validator;
        uint256 invitationDate;      
        uint256 acceptanceDate;
        AuditTypes audits;
    }

    struct Cohorts {
        address cohort;
        AuditTypes audits;
    }

    mapping(address => Cohorts[]) public cohortList;

    Members members;                                            // pointer to Members contract
    mapping (address =>  Invitation[]) public invitations;      // invitations list
    address platformAddress;                                    // address to deposit platform fees
    address createCohortAddress;

    event ValidatorInvited(address indexed inviting, address indexed invitee, AuditTypes audits, uint256 invitationNumber);
    event InvitationAccepted(address indexed validator, uint256 invitationNumber);
    event CohortCreated(address indexed enterprise, address indexed cohort, AuditTypes audits);


    constructor(Members _members,  address _createCohortAddress ) {
        members = _members;
        createCohortAddress = _createCohortAddress;
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender); // 
    }


    /**
    * @dev Used by Enterprise to invite validator
    * @param validator address of the validator to invite
    * @param audit type of the audit
    */
    function inviteValidator(address validator, AuditTypes audit) public {

        Invitation memory newInvitation;
        bool approvedValidator = members.validatorMap(validator);
        bool isEnterprise = members.enterpriseMap(msg.sender);
        (bool invited, ) = isValidatorInvited(msg.sender, validator, audit);
        require( !invited , "CohortFactory:inviteValidator - This validator has been already invited for this validation type." );
        require( isEnterprise, "CohortFactory:inviteValidator - Only Enterprise user can invite Validators.");
        require( approvedValidator, "CohortFactory:inviteValidator - Only Approved Validators can be invited.");
        require( members.deposits(validator) > 0,"CohortFactory:inviteValidator - This validator has not staked any tokens yet.");
        newInvitation.validator = validator;
        newInvitation.invitationDate = block.timestamp;     
        newInvitation.audits = audit;   
        invitations[msg.sender].push(newInvitation);
        emit ValidatorInvited(msg.sender, validator, audit, invitations[msg.sender].length - 1);
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
            inviteValidator(validator[i], audit);
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
    * @dev Used to determine size of validator list to be included in Cohort
    * @param enterprise address of the Enterprise who created invitation
    * @param audit type
    * @return count of invitations
    */
    function returnInvitationCount(address enterprise, AuditTypes audit) public view returns(uint256) {

        uint256 count;

        for (uint i=0; i < invitations[enterprise].length; ++i ){
            if (invitations[enterprise][i].audits == audit && invitations[enterprise][i].acceptanceDate != 0)
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
            if (invitations[enterprise][i].audits == audits && invitations[enterprise][i].validator == validator ){
                if (invitations[enterprise][i].acceptanceDate > 0)
                    return (true, true);
                return (true, false);
            }
        }
        return (false, false);
    }

     /**
    * @dev Used to return of list of cohorts for enterprise
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
    * @dev creates a new cohort using create2 methods based on the audit type
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

        address cohortAddress = CreateCohort(createCohortAddress).createCohort(uint256(audit),  validatorsList, msg.sender );
        cohortList[msg.sender].push();
        cohortList[msg.sender][cohortList[msg.sender].length - 1].cohort = cohortAddress;
        cohortList[msg.sender][cohortList[msg.sender].length - 1].audits = audit;

        emit CohortCreated(msg.sender, cohortAddress, AuditTypes(audit));
        
    }
}
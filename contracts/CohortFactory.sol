// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;
// pragma experimental ABIEncoderV2;
// import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./Cohort.sol";
import "./Members.sol";

contract CohortFactory is  AccessControl {

    enum AuditTypes {
        Financial,
        System,
        Contract,
        Type4,
        Type5,
        Type6
    }

    struct Invitation {
        address enterprise;
        address validator;
        uint256 invitationDate;      
        uint256 acceptanceDate;
        AuditTypes audits;
    }

    Members members;
    mapping (address =>  Invitation[]) public invitations;
    mapping (address => address[]) public validatorCohortList;
    address public auditToken; 

    event ValidatorInvited(address indexed inviting, address indexed invitee, AuditTypes audits, uint256 invitationNumber);
    event InvitationAccepted(address indexed validator, uint256 invitationNumber);
    event CohortCreated(address indexed enterprise, address indexed cohort, AuditTypes audits);


    constructor(Members _members, address _auditTokenAddress ) {

        members = _members;
        auditToken = _auditTokenAddress;
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }


    function inviteValidator(address invitee, AuditTypes audit) public {

        Invitation memory newInvitation;
        bool approvedValidator = members.validatorMap(invitee);
        // bool isEnterprise = members.enterpriseMap(msg.sender);
        (bool invited, ) =isValidatorInvited(msg.sender, invitee, audit);
        require( !invited , "CohortFactory:inviteValidator - This validator has been already invited for this validation type." );
        // require( isEnterprise, "CohortFactory:inviteValidator - Only Enterprise user can invite Validators.");
        require( approvedValidator, "CohortFactory:inviteValidator - Only Approved Validators can be invited.");
        // require( members.deposits(invitee) > 0,"CohortFactory:inviteValidator - This validator has not staked any tokens yet.");
        newInvitation.validator = invitee;
        newInvitation.invitationDate = block.timestamp;     
        newInvitation.audits = audit;   
        invitations[msg.sender].push(newInvitation);
        emit ValidatorInvited(msg.sender, invitee, audit, invitations[msg.sender].length - 1);
        }

    function inviteValidatorMultiple(address[] memory invitee, AuditTypes audit) public{

        uint256 length = invitee.length;
        require(length <= 256, "CohortFactory-inviteValidatorMultiple: List too long");
        for (uint256 i = 0; i < length; i++) {
            inviteValidator(invitee[i], audit);
        }
    }

    function acceptInvitationMultiple(address[] memory enterprise, uint256[] memory invitationNumber) public{

        uint256 length = enterprise.length;
        for (uint256 i = 0; i < length; i++) {
            acceptInvitation(enterprise[i], invitationNumber[i]);
        }
    }
    
    

    function acceptInvitation(address enterprise, uint256 invitationNumber) public {

        require( invitations[enterprise].length > invitationNumber, "CohortFactory:acceptInvitation - This invitation doesn't exist");
        require( invitations[enterprise][invitationNumber].acceptanceDate == 0, "CohortFactory:acceptInvitation- This invitation has been already accepted.");
        require( invitations[enterprise][invitationNumber].validator == msg.sender, "CohortFactory:acceptInvitation - You are accepting invitation to which you were not invited or this invitation doesn't exist.");
        invitations[enterprise][invitationNumber].acceptanceDate = block.timestamp;
        emit InvitationAccepted(msg.sender, invitationNumber);
    }

    function returnInvitationCount(address user, AuditTypes audit) public view returns(uint256) {

        uint256 count;

        for (uint i=0; i < invitations[user].length; ++i ){
            if (invitations[user][i].audits == audit)
                count ++;
        }
        return count;
    }

    function returnValidatorCohortsCount(address validator) public view returns (uint256){
        return validatorCohortList[validator].length;
    }


    function isValidatorInvited(address enterprise, address validator, AuditTypes types) public view returns (bool, bool) {

        for (uint i=0; i < invitations[enterprise].length; ++i ){
            if (invitations[enterprise][i].audits == types && invitations[enterprise][i].validator == validator ){
                if (invitations[enterprise][i].acceptanceDate > 0)
                    return (true, true);
                return (true, false);
            }
        }
        return (false, false);
    }

    function createValidatorCohortList(address[] memory validators, address cohort) internal {

        for (uint256 i=0; i< validators.length; i++){
            validatorCohortList[validators[i]].push(cohort);
        }

    }

    function createCohort(AuditTypes audit ) public {

        address[] memory validatorsList = new address[](returnInvitationCount(msg.sender, audit));
        uint k;
        for (uint i=0; i < invitations[msg.sender].length; ++i ){
            if (invitations[msg.sender][i].audits == audit && invitations[msg.sender][i].acceptanceDate > 0){
                validatorsList[k] = invitations[msg.sender][i].validator;
                k++;
            }
        }

        require(k >= 3, "CohortFactory:createCohort - Cohort requires at least 3 validators.");
        bytes memory bytecode = type(Cohort).creationCode;        
        bytes32 salt = keccak256(abi.encodePacked(msg.sender, audit));


        address cohortAddress;           
        assembly {
            cohortAddress := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        createValidatorCohortList(validatorsList, cohortAddress);
        Cohort(cohortAddress).initialize(auditToken, this, members, msg.sender, validatorsList, uint256(audit));
    
        emit CohortCreated(msg.sender, cohortAddress, audit);
    } 
}
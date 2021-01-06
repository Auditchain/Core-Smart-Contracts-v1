// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;
// pragma experimental ABIEncoderV2;
// import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "./Cohort.sol";
import "./Members.sol";
import "./Token.sol";

contract CohortFactory is  AccessControl {

    using SafeMath for uint256;
    using SafeERC20 for Token;

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
    Token public auditToken; 

    event ValidatorInvited(address indexed inviting, address indexed invitee, AuditTypes audits);
    event InvitationAccepted(address indexed validator, uint256 invitationNumber);
    event CohortCreated(address cohort);

   
    constructor(Members _members, Token _auditTokenAddress ) {

        // require(_auditTokenAddress != Token(0), "CohortFactory:constructor - Audit token address can't be 0");
        members = _members;
        auditToken = _auditTokenAddress;
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }


    function inviteValidator(address invitee, AuditTypes audit) public {

            Invitation memory newInvitation;
            require( isValidatorInvited(msg.sender, invitee, audit) == 0 , "CohortFactory:inviteValidator - This validator has been already invited for this validation type." );
            require( members.enterpriseMap(msg.sender), "CohortFactory:inviteValidator - Only Enterprise user can invite Validators.");
            require( members.validatorMap(invitee), "CohortFactory:inviteValidator - Only Approved Validators can be invited.");
            require( members.deposits(invitee) > 0,"CohortFactory:inviteValidator - This validator has not staked any tokens yet.");
            newInvitation.validator = invitee;
            newInvitation.invitationDate = block.timestamp;     
            newInvitation.audits = audit;   
            invitations[msg.sender].push(newInvitation);
            emit ValidatorInvited(msg.sender, invitee, audit);
        }

    function inviteValidatorMultiple(address[] memory invitee, AuditTypes audit) public{

        uint256 length = invitee.length;
        require(length <= 256, "CohortFactory-inviteValidatorMultiple: List too long");
        for (uint256 i = 0; i < length; i++) {
            inviteValidator(invitee[i], audit);
        }
    }

        function acceptInvitation(address enterprise, uint256 invitationNumber) public {

            require( invitations[enterprise].length > invitationNumber, "CohortFactory:acceptInvitation - This invitation doesn't exist");
            require( invitations[enterprise][invitationNumber].acceptanceDate == 0, "CohortFactory:acceptInvitation- This invitation has been already accepted.");
            require( invitations[enterprise][invitationNumber].validator == msg.sender, "CohortFactory:acceptInvitation - You are accepting invitation to which you were not invited or this invitation doesn't exist.");
            // if (invitations[enterprise][invitationNumber].acceptanceDate == 0)
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

        function isValidatorInvited(address enterprise, address validator, AuditTypes types) public view returns (uint256) {

            uint256 count;

            for (uint i=0; i < invitations[enterprise].length; ++i ){
                if (invitations[enterprise][i].audits == types && invitations[enterprise][i].validator == validator )
                    count ++;
            }
            return count;
        }

        function createCohort(AuditTypes audit ) public {

            address[] memory validatorsList = new address[](returnInvitationCount(msg.sender, audit));
            // address[] storage validatorsList[0] = msg.sender;

            
            uint k;
            for (uint i=0; i < invitations[msg.sender].length; ++i ){
                if (invitations[msg.sender][i].audits == audit){
                    
                    validatorsList[k] = invitations[msg.sender][i].validator;
                    k++;
                }
            }

            require(k >= 3, "CohortFactory:createCohort - Cohort requires at least 3 validators.");
            bytes memory bytecode = type(Cohort).creationCode;        
            // bytes32 salt = keccak256(abi.encodePacked(msg.sender, validatorsList));
            bytes32 salt = keccak256(abi.encodePacked(msg.sender, audit));


            address cohortAddress;           
            assembly {
                cohortAddress := create2(0, add(bytecode, 32), mload(bytecode), salt)
            }

            // require(size == 0, "CohortFactory:createCohort - Cohort contract has been already created");
            Cohort(cohortAddress).initialize(auditToken, this, members, msg.sender, validatorsList, uint256(audit));
        
            CohortCreated(cohortAddress);
        } 
}
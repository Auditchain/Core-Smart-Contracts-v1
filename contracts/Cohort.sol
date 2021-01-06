// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

import "./Token.sol";
import "./CohortFactory.sol";
import "./Members.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/access/Ownable.sol";



contract Cohort is Ownable, AccessControl {

    using SafeMath for uint256;
    using SafeERC20 for Token;

    address public enterprise;
    address[] public validators;
    uint256 public amountTokensPerDay = 683 * 10e18;
    uint256 public amountTokensPlatform = 10245 * 10e16;
    uint256 public amountTokensRewards = amountTokensPerDay - amountTokensPlatform;
    Token public auditToken;                         //AUDT token 
    CohortFactory public cohortFactory;
    Members public members;
    uint256 public recentBlockUpdated;

     // Create a new role identifier for the controller role
    bytes32 public constant CONTROLLER_ROLE = keccak256("CONTROLLER_ROLE");    
    modifier isController {
        require(hasRole(CONTROLLER_ROLE, msg.sender), "Cohort:isController - Caller is not a controller");

        _;
    }


    enum AuditTypes {
        Financial,
        System,
        Contract,
        Type4,
        Type5,
        Type6
    }

    AuditTypes audits;

    enum ValidationStatus {
        Undefined,
        Yes,
        No
    }

   

    struct Validation {       
        uint256 validationTime;
        uint256 executionTime;
        mapping(address => ValidationStatus) validatorChoice;
    }

    mapping(bytes32 => Validation) validations;
    mapping(address => uint256) public deposits;        //track deposits per user


    event ValidationInitialized(bytes32 validationHash, uint initTime, address enterprise);
    event ValidatorValidated(bytes32 documentHash, uint256 validationTime, ValidationStatus decision );
    event RewardsDeposited(address cohort, uint256 timeStamp);
    event ValidationExecuted(bytes32 validationHash, uint256 timeExecuted);
    event LogRewardsRedeemed(address user, uint256 amount);
    

    function initialize(Token _auditTokenContract, 
                        CohortFactory _cohortFactory, 
                        Members _members,
                        address _enterprise, 
                        address[] memory _validators, 
                        uint256 _audits) 
                        public {
        enterprise =_enterprise;
        validators = _validators;
        audits = AuditTypes(_audits);
        require(_auditTokenContract != Token(0), "Cohort:constructor - Audit token address can't be 0");
        auditToken = _auditTokenContract;
        cohortFactory = _cohortFactory;
        members = _members;
        _setupRole(DEFAULT_ADMIN_ROLE, auditToken.owner());
        // _setupRole(CONTROLLER_ROLE, auditToken.owner());
    }

    function returnValidators( ) public view returns(address[] memory) {

        return validators;
    }

    function redeem() public {

        uint256 amount = deposits[msg.sender];
        require(amount > 0, "Cohort:redeem - You don't have anything to redeem");
        deposits[msg.sender] = 0;
        auditToken.safeTransfer(msg.sender, amount);
        emit LogRewardsRedeemed(msg.sender, amount);
        
    }

    function updateDailyEarningsTransferFunds(address[] memory attesters, uint256[] memory tokens) public isController() {

        for (uint256 i=0; i< attesters.length; i++){
        deposits[attesters[i]] = deposits[attesters[i]].add(tokens[i]);
        }

        recentBlockUpdated = block.number;

        auditToken.mint(address(this), amountTokensRewards);
        auditToken.mint(owner(), amountTokensPlatform);
        emit RewardsDeposited(address(this), block.timestamp);
    }

    function initializeValidation(bytes32 documentHash) public {

        uint256 validationTime =  block.timestamp;
        bytes32 validationHash = keccak256(abi.encodePacked(documentHash, validationTime));

        require(enterprise == msg.sender, "Cohort:initializeValidation - Only enterprise owing this cohort can call this function");
        Validation storage newValidation =  validations[validationHash];
        newValidation.validationTime = block.timestamp;
        emit ValidationInitialized(validationHash, validationTime, msg.sender);
    

    }

    function collectValidationResults(bytes32 validationHash)public view isController() returns (address[] memory, uint256[] memory, ValidationStatus[] memory) {

        address[] memory validatorsList = validators;
        uint256[] memory stake = new uint256[](validators.length); 
        ValidationStatus[] memory validatorsValues = new ValidationStatus[](validators.length);

        Validation storage validation =  validations[validationHash];

        for (uint256 i=0; i< validators.length; i++ ){               
            stake[i] = members.deposits(validators[i]);
            validatorsValues[i] = validation.validatorChoice[validators[i]];
        }
        return (validatorsList, stake, validatorsValues);
    }

    function calculateVoteQuorum(bytes32 validationHash) public view returns(uint256) {

        uint totalStaked;
        uint currentlyVoted; 

        Validation storage validation =  validations[validationHash];
        require(validation.validationTime > 0, "Cohort:calculateVoteQuorum - Validation hash doesn't exist");

        for (uint256 i=0; i< validators.length; i++ ){
            totalStaked += members.deposits(validators[i]);
            if (validation.validatorChoice[validators[i]] ==  ValidationStatus.Yes || validation.validatorChoice[validators[i]] == ValidationStatus.No )
                currentlyVoted += members.deposits(validators[i]);
        }
        return currentlyVoted * 100/totalStaked;
    }

  
    function executeValidation(bytes32 validationHash) internal {

        if (calculateVoteQuorum(validationHash) > 85){
            Validation storage validation =  validations[validationHash];
            validation.executionTime = block.timestamp; 
            emit ValidationExecuted(validationHash, block.timestamp);
        }
    }

    function validate(bytes32 documentHash, uint256 validationTime, ValidationStatus decision ) public {

        bytes32 validationHash = keccak256(abi.encodePacked(documentHash, validationTime));
        Validation storage validation =  validations[validationHash];
        require(members.validatorMap(msg.sender), "Cohort:validate - Validator is not authorized.");
        require(validation.validationTime == validationTime, "Cohort:validate - the validation params don't match.");
        // require(validation.executionTime == 0, "Cohort:validate - The task has been already executed");
        validation.validatorChoice[msg.sender] = decision;

        executeValidation(validationHash);
            
        emit ValidatorValidated(documentHash, validationTime, decision );
    }
}
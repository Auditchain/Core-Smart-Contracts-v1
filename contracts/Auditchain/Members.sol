// SPDX-License-Identifier: MIT
pragma solidity =0.8.0;
pragma experimental ABIEncoderV2;
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./ICohortFactory.sol";
import "./../IAuditToken.sol";

/**
 * @title Members
 * Allows on creation of Enterprise and Validator accounts and staking of funds by validators
 * Validators and enterprises have ability to withdraw their staking and earnings 
 * Contract also contains several update functions controlled by the Governance contracts
 */

contract Members is  AccessControl {

    using SafeMath for uint256;
    using SafeERC20 for IERC20;

   

    bytes32 public constant CONTROLLER_ROLE = keccak256("CONTROLLER_ROLE");
    bytes32 public constant SETTER_ROLE =  keccak256("SETTER_ROLE");

    uint256 public amountTokensPerValidation =  100e18;    //New minted amount per validation

    uint256 public accessFee = 100e18;
    uint256 public enterpriseShareSubscriber = 40;
    uint256 public validatorShareSubscriber = 40;
    address public platformAddress;
    uint256 public platformShareValidation = 15;    
    uint256 public recentBlockUpdated;
    uint256 public enterpriseMatch = 200;         
    
 
    /// @dev check if caller is a controller     
    modifier isController {
        require(hasRole(CONTROLLER_ROLE, msg.sender), "Members:IsController - Caller is not a controller");

        _;
    }

    /// @dev check if caller is a setter     
    modifier isSetter {
        require(hasRole(SETTER_ROLE, msg.sender), "Members:isSetter - Caller is not a setter");

        _;
    }

     // Audit types to be used. Two types added for future expansion 
    enum UserType {Enterprise, Validator, DataSubscriber}  



    mapping(address => mapping(UserType => string)) public user;
    mapping(address => mapping(UserType => bool)) public userMap;
    address[] public enterprises;
    address[] public validators;
    address[] public dataSubscribers;
    // uint256 public enterpriseCount;
    // uint256 public validatorCount;
    // uint256 public dataSubscriberCount;
    
    event UserAdded(address indexed user, string name, UserType userType);
    event LogDepositReceived(address indexed from, uint amount);
    event LogSubscriptionCompleted(address subscriber, uint256 numberOfSubscriptions);
    event LogUpdateRewards(uint256 rewards);
    event LogUpdateEnterpriseMatch(uint256 portion);
    

    constructor(address _platformAddress ) {
        require(_platformAddress != address(0), "Members:constructor - Platform address can't be 0");
        platformAddress = _platformAddress;
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }


    /**
    * @dev to be called by Governance contract to update new amount for validation rewards
    * @param _amountTokensPerValidation new value of reward per validation
    */
    function updateRewards(uint256 _amountTokensPerValidation) public isSetter() {

        require(_amountTokensPerValidation != 0, "Members:updateRewards - New value for the reward can't be 0");
        amountTokensPerValidation = _amountTokensPerValidation;
        emit LogUpdateRewards(_amountTokensPerValidation);
    }
    
    /**
    * @dev to be called by Governance contract
    * @param _enterpriseMatch new value of enterprise portion of enterprise value of validation cost
    */
    function updateEnterpriseMatch(uint256 _enterpriseMatch) public isSetter()  {

        require(_enterpriseMatch != 0, "Members:updateMinDepositDays - New value for the enterprise match can't be 0");
        enterpriseMatch = _enterpriseMatch;
        emit LogUpdateEnterpriseMatch(_enterpriseMatch);
    }

    /**
    * @dev to be called by Governance contract to change enterprise and validators shares
    * of data subscription fees. 
    * @param _enterpriseShareSubscriber  - share of the enterprise
    * @param _validatorShareSubscriber - share of the subscribers
    */
    function setDataSubscriberShares(uint256 _enterpriseShareSubscriber, uint256 _validatorShareSubscriber ) public isSetter()  {

        require(_enterpriseShareSubscriber.add(validatorShareSubscriber) <=100, "Enterprise and Validator shares can't be larger than 100");
        enterpriseShareSubscriber = _enterpriseShareSubscriber;
        validatorShareSubscriber = _validatorShareSubscriber;
    }

   
    /*
    * @dev add new platform user
    * @param user to add
    * @param name name of the user
    * @param userType  
    */
    function addUser(address newUser, string memory name, UserType userType) public isController() {

        require(!userMap[newUser][userType], "Members:addUser - This user already exist.");
        user[newUser][userType] = name;
        userMap[newUser][userType] = true;

        if (userType == UserType.DataSubscriber) 
            dataSubscribers.push(newUser);
            // dataSubscriberCount++;
        else if (userType == UserType.Validator)
            validators.push(newUser);
            // validatorCount++;
        else if (userType == UserType.Enterprise)
            enterprises.push(newUser);
            // enterpriseCount++;

        // userAddersses.push(newUser);
     
        emit UserAdded(newUser, name, userType);
    }

    function returnValidatorList() public view returns(address[] memory) {

        return validators;
    }

}

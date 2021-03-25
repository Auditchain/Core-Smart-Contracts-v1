// SPDX-License-Identifier: MIT
pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "./ICohort.sol";
import "./ICohortFactory.sol";
import "./../AuditToken.sol";

/**
 * @title Members
 * Allows on creation of Enterprise and Validator accounts and staking of funds by validators
 * Validators also have ability to withdraw their staking
 */

contract Members is  AccessControl {

    using SafeMath for uint256;
    using SafeERC20 for AuditToken;

    struct DataSubscriberTypes{
        address cohort;
        uint256 audits;
    }

    

    // Create a new role identifier for the controller role
    bytes32 public constant CONTROLLER_ROLE = keccak256("CONTROLLER_ROLE");
    bytes32 public constant SETTER_ROLE =  keccak256("SETTER_ROLE");
    AuditToken public auditToken;                            //AUDT token 
    ICohortFactory public cohortFactory;
    uint256 public stakedAmount;                        //total number of staked tokens   
    mapping(address => uint256) public deposits;        //track deposits per user
    mapping(address => DataSubscriberTypes[]) public dataSubscriberCohorts;
     mapping(address => mapping(address => bool)) public dataSubscriberCohortMap;
    uint256 public amountTokensPerValidation =  1e18;    //New minted amount per validation

    uint256 public accessFee = 1000e18;
    uint256 public enterpriseShareSubscriber = 40;
    uint256 public validatorShareSubscriber = 40;
    address public platformAddress;
    uint256 public platformShareValidation = 15;    
    uint256 public recentBlockUpdated;
    uint256 public enterpriseMatch = 15e3;          //allow fractional enterprise match up to 4 decimal points
    uint256 public minDepositDays = 30;
 
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

    // Structure to store address and name of the registered
    struct User {  
        address user;
        string name;                                                                                                                         
    }

    User[] public enterprises;
    mapping(address => bool) public enterpriseMap;

    User[] public validators;
    mapping(address => bool) public validatorMap;

    User[] public dataSubscribers;
    mapping(address => bool) public dataSubscriberMap;
   
    
    event EnterpriseUserAdded(address indexed user, string name);
    event UserAdded(address indexed user, string name, UserType userType);
    event LogDepositReceived(address indexed from, uint amount);
    event LogRewardsRedeemed(address indexed from, uint256 amount);
    event LogDataSubscriberPaid(address indexed from, uint256 accessFee,  address cohortAddress, address enterprise, uint256 enterpriseShare);
    event LogDataSubscriberValidatorPaid(address  from, address indexed validator, uint256 amount);
    event LogRewardsDeposited(address cohort, uint256 tokens, uint256 enterpriseAmount, address indexed enterprise);
    event LogRewardsReceived(address indexed validator, uint256 tokens );
    event LogSubscriptionCompleted(address subscriber, uint256 numberOfSubscriptions);
    event LogUpdateRewards(uint256 rewards);
    event LogUpdateEnterpriseMatch(uint256 portion);
    event LogUpdateMinDepositDays(uint256 minDepositDays);

    constructor(AuditToken _auditToken, address _platformAddress ) {

        require(_auditToken != AuditToken(0), "Members:constructor - Audit token address can't be 0");
        require(_platformAddress != address(0), "Members:constructor - Platform address can't be 0");
        auditToken = _auditToken;        
        platformAddress = _platformAddress;
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
    * @dev to be called by administrator to set cohort Factory contract
    * @param _cohortFactory cohortFactory contract
    */
    function setCohortFactory(address _cohortFactory) public isController() {

        require(_cohortFactory != address(0), "Members:setCohortFactory - CohortFactory address can't be 0");
        cohortFactory = ICohortFactory(_cohortFactory);
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
    * @dev to be called by Governance contract to update days to calculate enterprise min deposit requirements
    * @param _minDepositDays new value of min deposit days
    */
    function updateMinDepositDays(uint256 _minDepositDays) public isSetter()  {

        require(_minDepositDays != 0, "Members:updateMinDepositDays - New value for the min deposit days can't be 0");
        minDepositDays = _minDepositDays;
        emit LogUpdateMinDepositDays(_minDepositDays);
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

    /**
     * @dev Function to accept contribution to staking
     * @param amount number of AUDT tokens sent to contract for staking     
     */ 
     function stake(uint256 amount) public {

        require(amount > 0, "Members:stake - Amount can't be 0");

        if (validatorMap[msg.sender]){ 
            require(amount + deposits[msg.sender] >= 5e21, "Staking:stake - Minimum contribution amount is 5000 AUDT tokens");  
            require(amount + deposits[msg.sender] <= 25e21, "Staking:stake - Maximum contribution amount is 25000 AUDT tokens");     
        }
        require(validatorMap[msg.sender] || enterpriseMap[msg.sender], "Staking:stake - User has been not registered as a validator or enterprise."); 
        stakedAmount = stakedAmount.add(amount);  // track tokens contributed so far
        auditToken.safeTransferFrom(msg.sender, address(this), amount);
        deposits[msg.sender] = deposits[msg.sender].add(amount);
        emit LogDepositReceived(msg.sender, amount);       
    }

    /**
    * @dev to be called by scheduled calls by platform daily 
    * @param _validators - list of validators eligible for earnings
    * @param tokens - list of tokens earned by each validator
    */
    function updateDailyEarningsTransferFunds(address[] memory _validators, uint256[] memory tokens, address cohort) public isController() {

        require(cohort != address(0), "Cohort address can't be 0");
        require(_validators.length == tokens.length, "Members:updateDailyEarningsTransferFunds - List of validators doesn't match list  of their respective tokens");

        uint256 totalRewardTokens;

        address enterpriseAddress = ICohort(cohort).enterprise();
        ICohort(cohort).resetOutstandingValidations();
        uint256 totalEnterprisePay;

        for (uint256 i=0; i< _validators.length; i++){
            require(_validators[i] != address(0), "One of the validators in the list has address 0");
            // 1e4 to adjust for 4 decimal points for enterpriseMatch
            uint256 enterprisePortion =  (tokens[i].mul(enterpriseMatch).div(1e4));
            totalEnterprisePay = totalEnterprisePay.add(enterprisePortion);
            deposits[_validators[i]] = deposits[_validators[i]].add(tokens[i]).add(enterprisePortion);
            totalRewardTokens = totalRewardTokens.add(tokens[i]);
            LogRewardsReceived(_validators[i], tokens[i].add(enterprisePortion));
        }
        // decrease enterprise token amount by its reward share to validators
        deposits[enterpriseAddress] = deposits[enterpriseAddress].sub(totalEnterprisePay);

        uint256 amountTokensPlatform = totalRewardTokens.mul(platformShareValidation).div(85);
        
        recentBlockUpdated = block.number;
        auditToken.mint(platformAddress, amountTokensPlatform);
        auditToken.mint(address(this), totalRewardTokens);
        emit LogRewardsDeposited(cohort, totalRewardTokens, totalEnterprisePay, enterpriseAddress);
    }

    /**
    * @dev called when data subscriber initiates subscription 
    * @param cohortAddress - address of the cohort to which data subscriber wants access 
    * @param audits - type of audits this cohort is part of
    */
    function dataSubscriberPayment(address cohortAddress, uint256 audits) public  {

        require(cohortAddress != address(0), "Members:dataSubscriberPayment - Cohort address can't be 0");
        require(audits >=0 && audits <=5, "Audit type is not in the required range");
        require(!dataSubscriberCohortMap[msg.sender][cohortAddress], "Members:dataSubscriberPayment - You are already subscribed");
        require(dataSubscriberMap[msg.sender], "Members:dataSubscriberPayment - You have to register as data subscriber");

        auditToken.safeTransferFrom(msg.sender, address(this), accessFee);
        auditToken.safeTransfer(platformAddress, accessFee.mul((uint256(100)).sub(enterpriseShareSubscriber).sub(validatorShareSubscriber)).div(100));

        if (validatorMap[msg.sender] || enterpriseMap[msg.sender]){
            stakedAmount = stakedAmount.sub(accessFee);  // track tokens contributed so far
            deposits[msg.sender] = deposits[msg.sender].sub(accessFee);
        }

        address cohortOwner = ICohort(cohortAddress).enterprise();
        uint256 enterpriseShare = accessFee.mul(enterpriseShareSubscriber).div(100);
        deposits[cohortOwner] = deposits[cohortOwner].add(enterpriseShare);
        allocateValidatorDataSubscriberFee(cohortAddress, accessFee.mul(validatorShareSubscriber).div(100));
        dataSubscriberCohorts[msg.sender].push();
        dataSubscriberCohorts[msg.sender][dataSubscriberCohorts[msg.sender].length -1].cohort = cohortAddress;
        dataSubscriberCohorts[msg.sender][dataSubscriberCohorts[msg.sender].length- 1].audits = audits;
        dataSubscriberCohortMap[msg.sender][cohortAddress] = true;

        emit LogDataSubscriberPaid(msg.sender, accessFee, cohortAddress, cohortOwner, enterpriseShare);
    }

    /**
    * @dev To return all cohorts to which data subscriber is subscribed to 
    * @param subscriber - address of the subscriber
    * @return the structure with cohort address and their types for subscriber
    */
    function returnCohortsForDataSubscriber(address subscriber) public view returns(DataSubscriberTypes[] memory){
            return (dataSubscriberCohorts[subscriber]);
    }

    /**
    * @dev To automate subscription for multiple cohorts for data subscriber 
    * @param cohortAddress - array of cohort addresses
    * @param audits - array of audit types for each cohort
    */
    function dataSubscriberPaymentMultiple(address[] memory cohortAddress, uint256[] memory audits) public {

        uint256 length = cohortAddress.length;
        require(length <= 256, "Members-dataSubscriberPaymentMultiple: List too long");
        for (uint256 i = 0; i < length; i++) {
            dataSubscriberPayment(cohortAddress[i], audits[i]);
        }

        emit LogSubscriptionCompleted(msg.sender, length);
    }

    /**
    * @dev To calculate validator share of data subscriber fee and allocate it to validator deposits
    * @param cohortAddress - address of cohort holding list of validators
    * @param amount - total amount of tokens available for allocation
    */
    function allocateValidatorDataSubscriberFee(address cohortAddress, uint amount) internal  {

        address[] memory cohortValidators = ICohort(cohortAddress).returnValidators();
        uint256 totalDeposits;

        for (uint i=0; i < cohortValidators.length; i++){
            totalDeposits = totalDeposits.add(deposits[cohortValidators[i]]);
        }

        for (uint i=0; i < cohortValidators.length; i++){
            uint256 oneValidatorPercentage = (deposits[cohortValidators[i]].mul(10e18)).div(totalDeposits);
            uint256 oneValidatorAmount = amount.mul(oneValidatorPercentage).div(10e18);
            deposits[cohortValidators[i]] = deposits[cohortValidators[i]].add(accessFee.mul(oneValidatorAmount).div(100).div(10e18)  );
            emit LogDataSubscriberValidatorPaid(msg.sender, cohortValidators[i], oneValidatorAmount);
        }
    }
   
     /**
     * @dev Function to redeem contribution. 
     * @param amount number of tokens being redeemed
     */
    function redeem(uint256 amount) public {

          if (enterpriseMap[msg.sender]){
              // div(1e4) to adjust for four decimal points
            require(deposits[msg.sender]
            .sub(enterpriseMatch
            .mul(amountTokensPerValidation)
            .mul(cohortFactory.returnOutstandingValidations())
            .div(1e4)) >= amount, 
            "Member:redeem - Your deposit will be too low to fullfil your outstanding payments.");
          }

        stakedAmount = stakedAmount.sub(amount);       
        deposits[msg.sender] = deposits[msg.sender].sub(amount);
        auditToken.safeTransfer(msg.sender, amount);
        emit LogRewardsRedeemed(msg.sender, amount);
        
    }

   
    /*
    * @dev add new platform user
    * @param user to add
    * @param name name of the user
    * @param userType  
    */
    function addUser(address user, string memory name, UserType userType) public isController() {

        User memory newUser;
        newUser.user = user;
        newUser.name = name;

        if (userType == UserType.DataSubscriber){
            require(!dataSubscriberMap[user], "Members:addUser - This Data Subscriber already exist.");
            dataSubscribers.push(newUser);
            dataSubscriberMap[user]= true;
        }
        else if (userType == UserType.Validator){            
            require(!validatorMap[user], "Members:addUser - This Validator already exist.");
            validators.push(newUser);
            validatorMap[user]= true;
        }
        else if (userType == UserType.Enterprise){
            require(!enterpriseMap[user], "Members:addUser - This Enterprise already exist.");
            enterprises.push(newUser);
            enterpriseMap[user]= true;
        }

        emit UserAdded(user, name, userType);
    }

    /*
    * @dev return enterprise count
    */
    function returnEnterpriseCount() public view returns (uint256) {

        return enterprises.length;
    }

    /*
    * @dev return validator count
    */
    function returnValidatorCount() public view returns (uint256) {

        return validators.length;
    }

      /*
    * @dev return data subscribers count
    */
    function returnDataSubscriberCount() public view returns (uint256) {

        return dataSubscribers.length;
    }

}



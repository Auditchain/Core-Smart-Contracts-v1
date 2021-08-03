// SPDX-License-Identifier: MIT
pragma solidity =0.8.0;
import "./Members.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./../IAuditToken.sol";
import "./ICohortFactory.sol";
import "./ICohort.sol";




/**
 * @title MemberHelpers
 * Additional function for Members 
 */
contract MemberHelpers is  AccessControl {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;


    bytes32 public constant CONTROLLER_ROLE = keccak256("CONTROLLER_ROLE");

    uint256 public minDepositDays = 30;
    uint256 public nonCohortValidationFee = 100e18;
    uint256 public cohortValidationFee = 100e18;
    uint256 public stakedAmount;                        //total number of staked tokens   
    address public auditToken;                       //AUDT token 
    Members members;
    ICohortFactory public cohortFactory;
    ICohort public cohort;
    mapping(address => uint256) public deposits;        //track deposits per user
    mapping(address => DataSubscriberTypes[]) public dataSubscriberCohorts;
    mapping(address => mapping(address => mapping(uint256 => bool))) public dataSubscriberCohortMap;


     struct DataSubscriberTypes{
        address cohort;
        uint256 audits;
    }


    enum UserType {Enterprise, Validator, DataSubscriber}  

    event LogDepositReceived(address indexed from, uint amount);
    event LogRewardsRedeemed(address indexed from, uint256 amount);
    event LogRewardsReceived(address indexed validator, uint256 tokens );
    event LogNonCohortValidationPaid(address requestor, address[] validators);
    event LogRewardsDeposited(uint256 tokens, uint256 enterpriseAmount, address indexed enterprise);
    event LogDataSubscriberPaid(address indexed from, uint256 accessFee,  uint256 audits, address enterprise, uint256 enterpriseShare);
    event LogSubscriptionCompleted(address subscriber, uint256 numberOfSubscriptions);
    event LogDataSubscriberValidatorPaid(address  from, address indexed validator, uint256 amount);
    




     constructor(address  _members, address _auditToken ) {
        require(_members != address(0), "MemberHelpers:constructor - Member address can't be 0");
        members = Members(_members);
        auditToken = _auditToken;
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

     /// @dev check if caller is a controller     
    modifier isController {
        require(hasRole(CONTROLLER_ROLE, msg.sender), "MemberHelpers:IsController - Caller is not a controller");

        _;
    }

   /**
    * @dev to be called by administrator to set cohort Factory contract
    * @param _cohortFactory cohortFactory contract
    */
    function setCohortFactory(address _cohortFactory) public isController() {

        require(_cohortFactory != address(0), "MemberHelpers:setCohortFactory - CohortFactory address can't be 0");
        cohortFactory = ICohortFactory(_cohortFactory);
    }

    function returnDepositAmount(address user) public view returns(uint256){

        return deposits[user];
    }


     /**
     * @dev Function to accept contribution to staking
     * @param amount number of AUDT tokens sent to contract for staking     
     */ 
     function stake(uint256 amount) public {

        require(amount > 0, "MemberHelpers:stake - Amount can't be 0");
      
        if (members.userMap(msg.sender, Members.UserType(1))){ 
            require(amount + deposits[msg.sender] >= 5e21, "MemberHelpers:stake - Minimum contribution amount is 5000 AUDT tokens");  
            require(amount + deposits[msg.sender] <= 25e21, "MemberHelpers:stake - Maximum contribution amount is 25000 AUDT tokens");     
        }
        require(members.userMap(msg.sender, Members.UserType(0)) || members.userMap(msg.sender, Members.UserType(1)) || members.userMap(msg.sender, Members.UserType(2)) , "Staking:stake - User has been not registered as a validator or enterprise."); 
        stakedAmount = stakedAmount.add(amount);  // track tokens contributed so far
        IERC20(auditToken).safeTransferFrom(msg.sender, address(this), amount);
        deposits[msg.sender] = deposits[msg.sender].add(amount);
        emit LogDepositReceived(msg.sender, amount);

    }


    /**
    * @dev to be called by administrator to set cohort Factory contract
    * @param _cohort cohort contract
    */
    function setCohort(address _cohort) public isController() {

        require(_cohort != address(0), "Members:setCohort - Cohort address can't be 0");
        cohort = ICohort(_cohort);
    }


    /**
     * @dev Function to redeem contribution. 
     * @param amount number of tokens being redeemed
     */
    function redeem(uint256 amount) public {

          if (members.userMap(msg.sender, Members.UserType(0))){
              uint256  outstandingVal = cohort.outstandingValidations(msg.sender);
              if (outstandingVal > 0 ) 
              // div(1e4) to adjust for four decimal points
            require(deposits[msg.sender]
            .sub(members.enterpriseMatch().mul(members.amountTokensPerValidation()).mul(outstandingVal).div(1e4)) >= amount, 
            "MemberHelpers:redeem - Your deposit will be too looutstandingValw to fullfil your outstanding payments.");
          }

        stakedAmount = stakedAmount.sub(amount);       
        deposits[msg.sender] = deposits[msg.sender].sub(amount);
        IERC20(auditToken).safeTransfer(msg.sender, amount);
        emit LogRewardsRedeemed(msg.sender, amount);
        
    }

     function processNonChortPayment(address[] memory _validators, address _requestor) public isController() {

        uint paymentPerValidator = nonCohortValidationFee.div(_validators.length);

        deposits[_requestor] = deposits[_requestor].sub(nonCohortValidationFee);
        
        for (uint i=0; i < _validators.length; i++) {
            deposits[_validators[i]] = deposits[_validators[i]].add(paymentPerValidator);
           emit LogRewardsReceived(_validators[i], paymentPerValidator);
        }
        emit LogNonCohortValidationPaid(_requestor, _validators);
    }

     function processPayment(address[] memory _validators, address _requestor) public isController() {

        uint256 enterprisePortion =  (members.amountTokensPerValidation().mul(members.enterpriseMatch())).div(100);
        // uint256 platformFee = (members.amountTokensPerValidation().mul(members.platformShareValidation())).div(100);
        // uint256 validatorsFee = (members.amountTokensPerValidation().add(enterprisePortion)).sub(platformFee);
        // uint256 paymentPerValidator = validatorsFee.div(_validators.length);
        // deposits[_requestor] = deposits[_requestor].sub(enterprisePortion);
        // IAuditToken(auditToken).mint(address(this), members.amountTokensPerValidation());
        // deposits[members.platformAddress()] = deposits[members.platformAddress()].add(platformFee);

        uint256 paymentPerValidator = 1000000000000000000;
        uint256 validatorsFee = 100000000000000000;
        // uint256 enterprisePortion = 100000000000000000;


        // for (uint256 i=0; i< _validators.length; i++){                     
        //     deposits[_validators[i]] = deposits[_validators[i]].add(paymentPerValidator);

        //     emit LogRewardsReceived(_validators[i], paymentPerValidator);
        // }
        // emit LogRewardsDeposited(validatorsFee, enterprisePortion, _requestor);
    }

    /**
    * @dev called when data subscriber initiates subscription 
    * @param enterpriseAddress - address of the enterprise
    * @param audits - type of audits this cohort is part of
    */
    function dataSubscriberPayment(address enterpriseAddress, uint256 audits) public  {

        require(enterpriseAddress != address(0), "MemberHelpers:dataSubscriberPayment - Enterprise address can't be 0");
        require(audits >=0 && audits <=5, "MemberHelpers:dataSubscriberPayment - Audit type is not in the required range");
        require(!dataSubscriberCohortMap[msg.sender][enterpriseAddress][audits], "MemberHelpers:dataSubscriberPayment - You are already subscribed");
        require(members.userMap(msg.sender, Members.UserType(2)), "MemberHelpers:dataSubscriberPayment - You have to register as data subscriber");
        require(deposits[msg.sender] >= members.accessFee(), "MemberHelpers:dataSubscriberPayment - You don't have enough AUDT to complet this tranasction.");

        IERC20(auditToken).safeTransferFrom(msg.sender, address(this), members.accessFee());
        // uint platformShare = (((members.enterpriseShareSubscriber()).add(members.validatorShareSubscriber())).mul(100)).div(members.accessFee());
        uint platformShare = 100 - members.enterpriseShareSubscriber() -members.validatorShareSubscriber();
        IERC20(auditToken).safeTransfer(members.platformAddress(), members.accessFee().mul(platformShare).div(100));

        if (members.userMap(msg.sender, Members.UserType(2)) || members.userMap(msg.sender, Members.UserType(0))){
            stakedAmount = stakedAmount.sub(members.accessFee());  // track tokens contributed so far
            deposits[msg.sender] = deposits[msg.sender].sub(members.accessFee());
        }

        uint256 enterpriseShare = members.accessFee().mul(members.enterpriseShareSubscriber()).div(100);
        deposits[enterpriseAddress] = deposits[enterpriseAddress].add(enterpriseShare);
        allocateValidatorDataSubscriberFee(enterpriseAddress, audits, members.accessFee().mul(members.validatorShareSubscriber()).div(100));
        dataSubscriberCohortMap[msg.sender][enterpriseAddress][audits] = true;

        emit LogDataSubscriberPaid(msg.sender, members.accessFee(), audits, enterpriseAddress, enterpriseShare);
    }

    /**
    * @dev To automate subscription for multiple cohorts for data subscriber 
    * @param cohortAddress - array of cohort addresses
    * @param audits - array of audit types for each cohort
    */
    function dataSubscriberPaymentMultiple(address[] memory cohortAddress, uint256[] memory audits) public {

        uint256 length = cohortAddress.length;
        require(length <= 256, "MemberHelpers:dataSubscriberPaymentMultiple - List too long");
        for (uint256 i = 0; i < length; i++) {
            dataSubscriberPayment(cohortAddress[i], audits[i]);
        }

        emit LogSubscriptionCompleted(msg.sender, length);
    }

    /**
    * @dev To calculate validator share of data subscriber fee and allocate it to validator deposits
    * @param enterprise - address of cohort holding list of validators
    * @param audits - audit type
    * @param amount - total amount of tokens available for allocation
    */
    function allocateValidatorDataSubscriberFee(address enterprise, uint256 audits, uint256 amount) internal  {

        address[] memory cohortValidators = cohortFactory.returnValidatorList(enterprise, audits);
        uint256 totalDeposits;

        for (uint i=0; i < cohortValidators.length; i++){
            totalDeposits = totalDeposits.add(deposits[cohortValidators[i]]);
        // emit total(totalDeposits);
        }

        for (uint i=0; i < cohortValidators.length; i++){
            uint256 oneValidatorPercentage = (deposits[cohortValidators[i]].mul(10e18)).div(totalDeposits);
            uint256 oneValidatorAmount = amount.mul(oneValidatorPercentage).div(10e18);
        //     deposits[cohortValidators[i]] = deposits[cohortValidators[i]].add(members.accessFee().mul(oneValidatorAmount).div(100).div(10e18)  );

            deposits[cohortValidators[i]] = deposits[cohortValidators[i]].add(oneValidatorAmount);
            emit LogDataSubscriberValidatorPaid(msg.sender, cohortValidators[i], oneValidatorAmount);
        }
    }

    // event total(uint256 dep);

    /**
    * @dev To return all cohorts to which data subscriber is subscribed to 
    * @param subscriber - address of the subscriber
    * @return the structure with cohort address and their types for subscriber
    */
    function returnCohortsForDataSubscriber(address subscriber) public view returns(DataSubscriberTypes[] memory){
            return (dataSubscriberCohorts[subscriber]);
    }
    
}
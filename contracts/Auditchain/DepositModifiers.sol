// SPDX-License-Identifier: MIT
pragma solidity =0.8.0;
pragma experimental ABIEncoderV2;
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./Members.sol";
import "./MemberHelpers.sol";
import "./ICohortFactory.sol";
import "./INodeOperations.sol";



/**
 * @title DepositModifiers
 * Collection of function which alter deposit values
 */

contract DepositModifiers is  AccessControl {

    using SafeERC20 for IERC20;
    using SafeMath for uint256;



    address public auditToken;                  
    Members members;
    MemberHelpers public memberHelpers;
    ICohortFactory public cohortFactory;
    INodeOperations public nodeOperations;

    mapping(address => DataSubscriberTypes[]) public dataSubscriberCohorts;

    struct DataSubscriberTypes{
        address cohort;
        uint256 audits;
    }

    mapping(address => mapping(address => mapping(uint256 => bool))) public dataSubscriberCohortMap;
    bytes32 public constant CONTROLLER_ROLE = keccak256("CONTROLLER_ROLE");


    event LogDataSubscriberPaid(address indexed from, uint256 accessFee,  uint256 indexed audits, address enterprise, uint256 enterpriseShare);
    event LogSubscriptionCompleted(address subscriber, uint256 numberOfSubscriptions);
    event LogDataSubscriberValidatorPaid(address  from, address indexed validator, uint256 amount);
    event LogFeesReceived(address indexed validator, uint256 tokens, bytes32 validationHash);
    event LogRewardsDeposited(uint256 tokens, uint256 enterpriseAmount, address indexed enterprise, bytes32 validationHash);
    event LogNonCohortValidationPaid(address indexed requestor, address winner, bytes32 validationHash, uint256 amount);



    constructor(address  _members, address _auditToken, address _memberHelpers, address _cohortFactory, address _nodeOperations ) {
        require(_members != address(0), "DepositModifier:constructor - Member address can't be 0");
        members = Members(_members);
        auditToken = _auditToken;
        memberHelpers = MemberHelpers(_memberHelpers);
        cohortFactory = ICohortFactory(_cohortFactory);
        nodeOperations = INodeOperations(_nodeOperations);
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /// @dev check if caller is a controller
    modifier isController(string memory source) {
        string memory msgError = string(abi.encodePacked("DepositModifier - (isController-Modifier):", source, "- Caller is not a controller"));
        require(hasRole(CONTROLLER_ROLE, msg.sender),msgError);

        _;
    }


    /**
    * @dev called when data subscriber initiates subscription 
    * @param enterpriseAddress - address of the enterprise
    * @param audits - type of audits this cohort is part of
    */
    function dataSubscriberPayment(address enterpriseAddress, uint256 audits) public  {

        require(enterpriseAddress != address(0), "DepositModifier:dataSubscriberPayment - Enterprise address can't be 0");
        require(audits >=0 && audits <=5, "DepositModifier:dataSubscriberPayment - Audit type is not in the required range");
        require(!dataSubscriberCohortMap[msg.sender][enterpriseAddress][audits], "DepositModifier:dataSubscriberPayment - You are already subscribed");
        require(members.userMap(msg.sender, Members.UserType(2)), "DepositModifier:dataSubscriberPayment - You have to register as data subscriber");

        uint256 accessFee = members.accessFee();

        require(memberHelpers.returnDepositAmount(msg.sender) >= accessFee, "DepositModifier:dataSubscriberPayment - You don't have enough AUDT to complet this tranasction.");
        IERC20(auditToken).safeTransferFrom(msg.sender, address(this), accessFee);
        uint platformShare = (uint256(100)).sub(members.enterpriseShareSubscriber()).sub(members.validatorShareSubscriber());
        IERC20(auditToken).safeTransfer(members.platformAddress(), accessFee.mul(platformShare).div(100));

        if (members.userMap(msg.sender, Members.UserType(2)) || members.userMap(msg.sender, Members.UserType(0))){
            memberHelpers.decreaseDeposit(msg.sender, accessFee);
        }

        uint256 enterpriseShare = accessFee.mul(members.enterpriseShareSubscriber()).div(100);
        memberHelpers.increaseDeposit(enterpriseAddress, enterpriseShare);

        allocateValidatorDataSubscriberFee(enterpriseAddress, audits, accessFee.mul(members.validatorShareSubscriber()).div(100));
        dataSubscriberCohortMap[msg.sender][enterpriseAddress][audits] = true;

        emit LogDataSubscriberPaid(msg.sender, accessFee, audits, enterpriseAddress, enterpriseShare);
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
            totalDeposits = totalDeposits.add(memberHelpers.returnDepositAmount(cohortValidators[i]));
        }

        for (uint i=0; i < cohortValidators.length; i++){
            uint256 oneValidatorPercentage = (memberHelpers.returnDepositAmount(cohortValidators[i]).mul(10e18)).div(totalDeposits);
            uint256 oneValidatorAmount = amount.mul(oneValidatorPercentage).div(10e18);
            memberHelpers.increaseDeposit(cohortValidators[i], oneValidatorAmount);
            emit LogDataSubscriberValidatorPaid(msg.sender, cohortValidators[i], oneValidatorAmount);
        }
    }


    /**
    * @dev To automate subscription for multiple cohorts for data subscriber 
    * @param enterprise - array of enterprise addresses
    * @param audits - array of audit types for each cohort
    */
    function dataSubscriberPaymentMultiple(address[] memory enterprise, uint256[] memory audits) public {

        uint256 length = enterprise.length;
        require(length <= 256, "DepositModifiers:dataSubscriberPaymentMultiple - List too long");
        for (uint256 i = 0; i < length; i++) {
            dataSubscriberPayment(enterprise[i], audits[i]);
        }

        emit LogSubscriptionCompleted(msg.sender, length);
    }

    /**
    * @dev To process payment for cohort validation
    * @param winner - winner of POW
    * @param _requestor - requesting party
    * @param validationHash -  hash identifying validation
    */
    function processPayment(address winner, address _requestor, bytes32 validationHash) public isController("processPayment") {

        uint256 enterprisePortion =  members.amountTokensPerValidation().mul(members.enterpriseMatch()).div(100);
        uint256 platformFee = members.amountTokensPerValidation().mul(members.platformShareValidation()).div(100);
        uint256 winnerFee = members.amountTokensPerValidation().add(enterprisePortion).sub(platformFee);

        memberHelpers.decreaseDeposit(_requestor, enterprisePortion);
        IAuditToken(auditToken).mint(address(this), members.amountTokensPerValidation());
        memberHelpers.increaseDeposit(members.platformAddress(), platformFee);

        memberHelpers.increaseDeposit(winner, winnerFee);
        emit LogFeesReceived(winner, winnerFee, validationHash);
        emit LogRewardsDeposited(winnerFee, enterprisePortion, _requestor, validationHash);
    }


     /**
    * @dev To process payment for no cohort validation
    * @param _winner - winner of the POW
    * @param _requestor - requesting party
    * @param validationHash -  hash identifying validation
    */
    function processNonChortPayment(address _winner, address _requestor, bytes32 validationHash) public isController("processNonChortPayment") {

        uint256 POWFee = nodeOperations.POWFee();
        memberHelpers.decreaseDeposit(_requestor, POWFee);
        nodeOperations.increasePOWRewards(_winner, POWFee);
        emit LogNonCohortValidationPaid(_requestor, _winner, validationHash, POWFee);
    }

    /**
    * @dev To return all cohorts to which data subscriber is subscribed to 
    * @param subscriber - address of the subscriber
    * @return the structure with cohort address and their types for subscriber
    */
    function returnCohortsForDataSubscriber(address subscriber) public view returns(DataSubscriberTypes[] memory){
            return (dataSubscriberCohorts[subscriber]);
    }

}
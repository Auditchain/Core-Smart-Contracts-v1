// SPDX-License-Identifier: MIT
pragma solidity =0.8.0;
import "./Members.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./../IAuditToken.sol";
import "./IValidations.sol";


/**
 * @title MemberHelpers
 * Additional function for Members 
 */
contract MemberHelpers is  AccessControl {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;


    bytes32 public constant CONTROLLER_ROLE = keccak256("CONTROLLER_ROLE");

    uint256 public stakedAmount;                        //total number of staked tokens   
    address public auditToken;                          //AUDT token 
    Members members;                                    // Members contract
    IValidatinos public validations;                    // Validation interface
    mapping(address => uint256) public deposits;        //track deposits per user
    uint256 public minDepositDays = 60;                 // number of days considered to calculate average spendings

    event LogDepositReceived(address indexed from, uint amount);
    event LogRewardsRedeemed(address indexed from, uint256 amount);
    
    constructor(address  _members, address _auditToken ) {
        require(_members != address(0), "MemberHelpers:constructor - Member address can't be 0");
        require(_auditToken != address(0), "MemberHelpers:setCohort - Cohort address can't be 0");

        members = Members(_members);
        auditToken = _auditToken;
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /// @dev check if caller is a controller     
    modifier isController {
        require(hasRole(CONTROLLER_ROLE, msg.sender), "MemberHelpers:IsController - Caller is not a controller");

        _;
    }

    function returnDepositAmount(address user) public view returns(uint256){

        return deposits[user];
    }

    function increaserStakedAmount(uint256 amount) public isController() {

        stakedAmount = stakedAmount.add(amount);

    }

    function decreaseStakedAmount(uint256 amount) public isController() {

        stakedAmount = stakedAmount.sub(amount);

    }

    function increaseDeposit(address user, uint256 amount) public isController() {
        deposits[user] = deposits[user].add(amount);
    }

    function decreaseDeposit(address user, uint256 amount) public isController() {
        deposits[user] = deposits[user].sub(amount);
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
     * @dev Function to redeem contribution. 
     * @param amount number of tokens being redeemed
     */
    function redeem(uint256 amount) public {

        if (members.userMap(msg.sender, Members.UserType(0))){
            uint256  outstandingVal = validations.outstandingValidations(msg.sender);
            
            if (outstandingVal > 0 )  // div(1e4) to adjust for four decimal points
                require(deposits[msg.sender]
                .sub(members.enterpriseMatch().mul(members.amountTokensPerValidation()).mul(outstandingVal).div(1e4)) >= amount, 
                "MemberHelpers:redeem - Your deposit will be too low to fullfil your outstanding payments.");
        }

        stakedAmount = stakedAmount.sub(amount);       
        deposits[msg.sender] = deposits[msg.sender].sub(amount);
        IERC20(auditToken).safeTransfer(msg.sender, amount);
        emit LogRewardsRedeemed(msg.sender, amount);
        
    }

     /**
    * @dev to be called by administrator to set Validation address
    * @param _validations validation contract address
    */
    function setValidation(address _validations) public isController() {

        require(_validations != address(0), "MemberHelpers:setValidation - Validation address can't be 0");
        validations = IValidatinos(_validations);

    }

    
}
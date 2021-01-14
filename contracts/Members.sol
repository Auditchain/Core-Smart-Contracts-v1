// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;
// import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "./Cohort.sol";
import "./Token.sol";


contract Members is  AccessControl {

    using SafeMath for uint256;
    using SafeERC20 for Token;

    

     // Create a new role identifier for the controller role
    bytes32 public constant CONTROLLER_ROLE = keccak256("CONTROLLER_ROLE");
    Token public auditToken;                         //AUDT token 
    uint256 public stakedAmount;                        //total number of staked tokens   
    mapping(address => uint256) public deposits;        //track deposits per user

    modifier isController {
        require(hasRole(CONTROLLER_ROLE, msg.sender), "Members:IsController - Caller is not a controller");

        _;
    }

    struct Enterprise {  
        address user;
        string name;                                                                                                                         
        uint256 joined;                                                                                                                                                                
    }


    struct Validator {

        address user;
        string name;
        uint256 joined;
    }

    enum AuditTypes {
            Financial,
            System,
            Contract,
            Type4,
            Type5,
            Type6
        }

    // struct Invitation {

    //     address enterprise;
    //     address validator;
    //     uint256 invitationDate;      
    //     uint256 acceptanceDate;
    //     AuditTypes audits;
    // }


    Enterprise[] public enterprises;
    mapping(address => bool) public enterpriseMap;
    // uint public enterpriseCount;

    Validator[] public validators;
    mapping(address => bool) public validatorMap;
    // uint public validatorCount;

    // mapping (address =>  Invitation[]) public invitations;
    
    event EnterpriseUserAdded(address indexed user, string name);
    event ValidatorUserAdded(address indexed user, string name);
    // event ValidatorInvited(address indexed inviting, address indexed invitee, AuditTypes audits);
    // event InvitationAccepted(address indexed validator, uint256 invitationNumber);
    

    // event CohortCreated(address cohort);
    ///@dev Emitted when when deposit is received
    event LogDepositReceived(address indexed from, uint amount);

    ///@dev Emitted when deposit is withdrawn before end of staking
    event LogDepositCancelled(address indexed from, uint256 amount);
   
    constructor(Token _auditTokenAddress ) {

        // require(_auditTokenAddress != Token(0), "Members:constructor - Audit token address can't be 0");
        auditToken = _auditTokenAddress;
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }


    /**
     * @dev Function to accept contribution to staking
     * @param amount number of AUDT tokens sent to contract for staking     
     */ 

     function stake(uint256 amount) public {

        require(amount + deposits[msg.sender] >= 5e21, "Staking:stake - Minimum contribution amount is 5000 AUDT tokens");  
        require(amount + deposits[msg.sender] <= 25e21, "Staking:stake - Maximum contribution amount is 25000 AUDT tokens");     
        require(validatorMap[msg.sender], "Staking:stake - User has been not registered as a validator."); 
        stakedAmount = stakedAmount.add(amount);  // track tokens contributed so far
        auditToken.safeTransferFrom(msg.sender, address(this), amount);
        deposits[msg.sender] = deposits[msg.sender].add(amount);
        emit LogDepositReceived(msg.sender, amount);       
    }

   
     /**
     * @dev Function to redeem contribution. 
     * @param amount number of tokens being redeemed
     */
    function redeem(uint256 amount) public {

        stakedAmount = stakedAmount.sub(amount);       
        deposits[msg.sender] = deposits[msg.sender].sub(amount);
        auditToken.safeTransfer(msg.sender, amount);
        emit LogDepositCancelled(msg.sender, amount);
        
    }

    /// @dev add enterprise user
    /// @param user to add
    /// @param name name of the user
    function addEnterpriseUser (address user, string memory name) public  isController() {    
        Enterprise memory newEnterprise;
        require(!enterpriseMap[user], "Members:addEnterpriseUser - This Enterprise already exist.");
        newEnterprise.user = user;
        newEnterprise.name = name;
        newEnterprise.joined = block.timestamp;
        
        enterprises.push(newEnterprise);
        enterpriseMap[user] = true;
        emit EnterpriseUserAdded(user, name);
    }

    /// @dev add validator user
    /// @param user to add
    /// @param name name of the user
    function addValidatorUser(address user, string memory name) public isController() {

        Validator memory newValidator;
        require(!validatorMap[user], "Members:addValidatorUser - This Validator already exist.");
        newValidator.user = user;
        newValidator.name = name;
        newValidator.joined = block.timestamp;
        validators.push(newValidator);
        validatorMap[user] = true;
        emit ValidatorUserAdded(user, name);
    }

    
    function returnEnterpriseCount() public view returns (uint256) {

        return enterprises.length;
    }

    function returnValidatorCount() public view returns (uint256) {

        return validators.length;
    }

    function returnEnterpriseName(address enterprise) public view returns (string memory) {

        for (uint256 i = 0; i < enterprises.length; i++){

            if (enterprises[i].user == enterprise)
                return enterprises[i].name;
        }
        return "";
    }

}
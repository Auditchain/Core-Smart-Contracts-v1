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
contract MemberHelpers is AccessControl {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    bytes32 public constant CONTROLLER_ROLE = keccak256("CONTROLLER_ROLE");

    address public auditToken; //AUDT token
    Members members; // Members contract
    IValidatinos public validations; // Validation interface
    mapping(address => uint256) public deposits; //track deposits per user
    mapping(address => address[]) public delegations;
    mapping(address => address) public delegatorLink;
    mapping(address => mapping(address => bool)) isDelegating;
    uint256 public minDepositDays = 60; // number of days considered to calculate average spendings
    mapping(address => uint256) public stakeAmount;
    mapping(address => bool) public nodeOperator;
    uint256 public stakeRatio = 1000;
    uint256 public stakeRatioDelegating = 1100;
    uint256 public stakingRatioReferral = 9100;

    event LogDepositReceived(address indexed from, uint256 amount);
    event LogDepositRedeemed(address indexed from, uint256 amount);
    event LogStakingRewardsClaimed(address indexed user, uint256 amount);
    event LogStakingRewardsTransferredOut(address indexed user, uint256 amount);
    event LogIncreaseDeposit(address user, uint256 amount);
    event LogDecreaseDeposit(address user, uint256 amount);
    event LogDelegation(address indexed delegating, address indexed newDelegatee);
    event LogRemoveDelegation(address indexed delegating, address indexed delegatee);
    event LogStakeRewardsIncreased(address indexed validator, uint256 amount);
    event LogDelegatedStakeRewardsIncreased(address indexed delegating, uint256 amount);
    event LogReferralStakeRewardsIncreased(address indexed delegating, uint256 amount);

    constructor(address _members, address _auditToken) {
        require(
            _members != address(0),
            "MemberHelpers:constructor - Member address can't be 0"
        );
        require(
            _auditToken != address(0),
            "MemberHelpers:setCohort - Cohort address can't be 0"
        );

        members = Members(_members);
        auditToken = _auditToken;
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /// @dev check if caller is a controller
    modifier isController() {
        require(
            hasRole(CONTROLLER_ROLE, msg.sender),
            "MemberHelpers:IsController - Caller is not a controller"
        );

        _;
    }

    function returnDepositAmount(address user) public view returns (uint256) {
        return deposits[user];
    }

    function returnPoolList(address poolOperator)public view returns (address[] memory, uint256[] memory) {

        address[] memory poolUsers = new address[](delegations[poolOperator].length  );
        uint256[] memory poolUsersStakes = new uint256[](delegations[poolOperator].length );


         for (uint256 i = 0; i< delegations[poolOperator].length ;i++) {
             poolUsers[i]= delegations[poolOperator][i];
             poolUsersStakes[i] = deposits[poolUsers[i]];

         }

         return (poolUsers, poolUsersStakes);
        
    }

    function increaseDeposit(address user, uint256 amount) public isController {
        deposits[user] = deposits[user].add(amount);
        emit LogIncreaseDeposit(user, amount);
    }

    function decreaseDeposit(address user, uint256 amount) public isController {
        deposits[user] = deposits[user].sub(amount);
        emit LogDecreaseDeposit(user, amount);
    }

    /**
     * @dev Function to accept contribution to staking
     * @param amount number of AUDT tokens sent to contract for staking
     */
    function stake(uint256 amount) public {
        require(amount > 0, "MemberHelpers:stake - Amount can't be 0");

        if (members.userMap(msg.sender, Members.UserType(1))) {
            require(
                amount + deposits[msg.sender] >= 5e21,
                "MemberHelpers:stake - Minimum contribution amount is 5000 AUDT tokens"
            );
            require(
                amount + deposits[msg.sender] <= 25e21,
                "MemberHelpers:stake - Maximum contribution amount is 25000 AUDT tokens"
            );
        }
        require(
            members.userMap(msg.sender, Members.UserType(0)) ||
                members.userMap(msg.sender, Members.UserType(1)) ||
                members.userMap(msg.sender, Members.UserType(2)),
            "Staking:stake - User has been not registered as a validator or enterprise."
        );
        IERC20(auditToken).safeTransferFrom(msg.sender, address(this), amount);
        deposits[msg.sender] = deposits[msg.sender].add(amount);
        emit LogDepositReceived(msg.sender, amount);
    }

    /**
     * @dev Function to redeem contribution.
     * @param amount number of tokens being redeemed
     */
    function redeem(uint256 amount) public {
        if (members.userMap(msg.sender, Members.UserType(0))) {
            uint256 outstandingVal = validations.outstandingValidations(
                msg.sender
            );

            if (outstandingVal > 0)
                // div(1e4) to adjust for four decimal points
                require(
                    deposits[msg.sender].sub(
                        members
                            .enterpriseMatch()
                            .mul(members.amountTokensPerValidation())
                            .mul(outstandingVal)
                            .div(1e4)
                    ) >= amount,
                    "MemberHelpers:redeem - Your deposit will be too low to fullfil your outstanding payments."
                );
        }

        deposits[msg.sender] = deposits[msg.sender].sub(amount);
        IERC20(auditToken).safeTransfer(msg.sender, amount);
        emit LogDepositRedeemed(msg.sender, amount);
    }

    /**
     * @dev to be called by administrator to set Validation address
     * @param _validations validation contract address
     */
    function setValidation(address _validations) public isController {
        require(
            _validations != address(0),
            "MemberHelpers:setValidation - Validation address can't be 0"
        );
        validations = IValidatinos(_validations);
    }

    function increaseStakeRewards(address validator) public isController {
        uint256 amount = deposits[validator].div(stakeRatio);

        stakeAmount[validator] = stakeAmount[validator].add(amount);
        emit LogStakeRewardsIncreased(validator, amount);
    }

    function claimStakeRewards(bool deliver) public {
        uint256 payment = stakeAmount[msg.sender];
        stakeAmount[msg.sender] = 0;
        if (deliver) {
            IAuditToken(auditToken).mint(msg.sender, payment);
            emit LogStakingRewardsTransferredOut(msg.sender, payment);
        } else {
            IAuditToken(auditToken).mint(address(this), payment);
            deposits[msg.sender] = deposits[msg.sender].add(payment);
            emit LogStakingRewardsClaimed(msg.sender, payment);
        }
    }

    function removeAlldelegations() public {

        // require(delegations[msg.sender].length == 0, );

         for (uint256 i = delegations[msg.sender].length  ; i > 0; i--) {
        //    for (uint256 i = 0; i>=0; i--) {
               address delegating = delegations[msg.sender][i-1];
                delegations[msg.sender].pop();   
               isDelegating[msg.sender][delegating] = false;
               delegatorLink[delegating] = address(0x0);
            }
    }

    function removeDelegation() public {

        address oldDelegatee = delegatorLink[msg.sender];

        require(oldDelegatee != address(0x0), "MemberHelpers:removeDelegation You are not delegating your stake yet.");


        for (uint256 i = 0; i < delegations[oldDelegatee].length; i++) {
            if (delegations[oldDelegatee][i] == msg.sender) {
                delegations[oldDelegatee][i] = delegations[oldDelegatee][delegations[oldDelegatee].length - 1];
                delegations[oldDelegatee].pop();
                isDelegating[oldDelegatee][msg.sender] = false;
                delegatorLink[msg.sender] = address(0x0);
            }
        }

        emit LogRemoveDelegation(msg.sender, oldDelegatee);
    }

    function delegate(address delegatee) public {
        require(
            !isDelegating[delegatee][msg.sender],
            "MemberHelpers:delegatge - You are already delegating to this member."
        );

        if (delegatorLink[msg.sender] != address(0x0)) 
            removeDelegation();

        delegations[delegatee].push(msg.sender);
        delegatorLink[msg.sender] = delegatee;
        isDelegating[delegatee][msg.sender] = true;

        emit LogDelegation(msg.sender, delegatee);
    }

    function increaseDelegatedStakeRewards(address validator) public {
        uint256 referringReward;

        for (uint256 i = 0; i < delegations[validator].length; i++) {
            address delegating = delegations[validator][i];
            uint256 amount = deposits[delegating].div(stakeRatioDelegating);
            stakeAmount[delegating] = stakeAmount[delegating].add(amount);
            referringReward = referringReward.add(
                deposits[delegating].div(stakingRatioReferral)
            );
            emit LogDelegatedStakeRewardsIncreased(delegating, amount);
        }

        if (referringReward > 0) {
            stakeAmount[validator] = stakeAmount[validator].add(referringReward);
            emit LogReferralStakeRewardsIncreased(validator, referringReward);
        }
    }

    function toggleNodeOperator() public {

        if (nodeOperator[msg.sender]){
            nodeOperator[msg.sender] = false;
            removeAlldelegations();
        }
        else    
            nodeOperator[msg.sender] = true;
    }
}

// SPDX-License-Identifier: MIT
pragma solidity =0.8.0;
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./../IAuditToken.sol";
import "./MemberHelpers.sol";
import "./../IAuditToken.sol";



/**
 * @title NodeOperations
 * Additional function for Members
 */
contract NodeOperations is AccessControl {

    using SafeMath for uint256;

    MemberHelpers public memberHelpers;
    address public auditToken; //AUDT token

    address[] public nodeOperators;
    mapping(address => uint256) public POWAmount;

    mapping(address => bool) public isNodeOperator;
    mapping(address => address[]) public delegations;
    mapping(address => mapping(address => bool)) isDelegating;
    mapping(address => address) public delegatorLink;
    mapping(address => uint256) public stakeAmount;
    mapping(address => uint256) public referralAmount;
    uint256 public stakeRatio = 1000;
    uint256 public stakeRatioDelegating = 1100;
    uint256 public stakingRatioReferral = 9100;



    bytes32 public constant CONTROLLER_ROLE = keccak256("CONTROLLER_ROLE");

    event LogNodeOperatorCreated(address indexed user);
    event LogNodeOperatorCancelled(address indexed user);
    event LogRemoveDelegation(address indexed delegating, address indexed delegatee);
    event LogDelegation(address indexed delegating, address indexed newDelegatee);
    event LogDelegatedStakeRewardsIncreased(address indexed delegating, uint256 amount);
    event LogReferralStakeRewardsIncreased(address indexed delegating, uint256 amount);
    event LogStakingRewardsTransferredOut(address indexed user, uint256 amount);
    event LogStakingRewardsClaimed(address indexed user, uint256 amount);
    event LogStakeRewardsIncreased(address indexed validator, uint256 amount);



    

    constructor(address _memberHelpers, address _auditToken) {
        require(_memberHelpers != address(0), "NodeOperations:constructor - MemberHelpers address can't be 0");
        require( _auditToken != address(0), "MemberHelpers:setCohort - Cohort address can't be 0");
        memberHelpers = MemberHelpers(_memberHelpers);
        auditToken = _auditToken;
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }


     /// @dev check if caller is a controller
    modifier isController() {
        require(
            hasRole(CONTROLLER_ROLE, msg.sender),
            "NodeOperations:IsController - Caller is not a controller"
        );

        _;
    }


    function returnPoolList(address poolOperator)public view returns (address[] memory, uint256[] memory) {

        address[] memory poolUsers = new address[](delegations[poolOperator].length  );
        uint256[] memory poolUsersStakes = new uint256[](delegations[poolOperator].length );


        for (uint256 i = 0; i< delegations[poolOperator].length ;i++) {
            poolUsers[i]= delegations[poolOperator][i];
            poolUsersStakes[i] = memberHelpers.returnDepositAmount(poolUsers[i]);

        }

        return (poolUsers, poolUsersStakes);
    
    }


    function toggleNodeOperator() public {

        if (isNodeOperator[msg.sender]){
            isNodeOperator[msg.sender] = false;
            removeNodeOperator();
            removeAlldelegations();
            emit LogNodeOperatorCreated(msg.sender);
        }
        else{
            isNodeOperator[msg.sender] = true;
            addNodeOperator();
            emit LogNodeOperatorCancelled(msg.sender);
        }
    }

     function removeNodeOperator() internal {

        for (uint256 i= 0; i < nodeOperators.length; i++) {

            if (nodeOperators[i] == msg.sender){

                nodeOperators[i] = nodeOperators[nodeOperators.length - 1];
                nodeOperators.pop();
                i = nodeOperators.length;
            }
        }
    }


    function addNodeOperator() internal {

        nodeOperators.push(msg.sender);

    } 

    function returnNodeOperators() public view returns (address[] memory) {

        return nodeOperators;
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
                i= delegations[oldDelegatee].length;
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

    function increasePOWRewards(address validator, uint256 amount) public isController() {
            POWAmount[validator] = POWAmount[validator].add(amount);
    }

    function increaseDelegatedStakeRewards(address validator) public isController() {
        uint256 referringReward;

        for (uint256 i = 0; i < delegations[validator].length; i++) {
            address delegating = delegations[validator][i];
            uint256 amount = memberHelpers.returnDepositAmount(delegating).div(stakeRatioDelegating);
            stakeAmount[delegating] = stakeAmount[delegating].add(amount);
            referringReward = referringReward.add(memberHelpers.returnDepositAmount(delegating).div(stakingRatioReferral)
            );
            emit LogDelegatedStakeRewardsIncreased(delegating, amount);
        }

        if (referringReward > 0) {
            referralAmount[validator] = referralAmount[validator].add(referringReward);
            emit LogReferralStakeRewardsIncreased(validator, referringReward);
        }
    }

    function claimStakeRewards(bool deliver) public {
        uint256 stakeRewards = stakeAmount[msg.sender];
        uint256 powRewards = POWAmount[msg.sender];
        uint256 refRewards = referralAmount[msg.sender];

        uint256 payment = stakeRewards.add(powRewards).add(refRewards);
        stakeAmount[msg.sender] = 0;
        POWAmount[msg.sender] = 0;
        referralAmount[msg.sender] = 0;

        if (deliver) {
            IAuditToken(auditToken).mint(msg.sender, payment);
            emit LogStakingRewardsTransferredOut(msg.sender, payment);
        } else {
            memberHelpers.increaseDeposit(msg.sender, payment);
            IAuditToken(auditToken).mint(address(this), payment);
            emit LogStakingRewardsClaimed(msg.sender, payment);
        }
    }

    function increaseStakeRewards(address validator) public isController {
        uint256 amount = memberHelpers.returnDepositAmount(validator).div(stakeRatio);

        stakeAmount[validator] = stakeAmount[validator].add(amount);
        emit LogStakeRewardsIncreased(validator, amount);
    }

}
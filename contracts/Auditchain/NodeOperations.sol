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
    address public auditToken;          

    address[] public nodeOperators;
    address[] public CPAs;

    uint256 public stakeRatio = 1000;
    uint256 public stakeRatioDelegating = 1100;
    uint256 public stakingRatioReferral = 9100;
    uint256 public POWFee = 100e18;


    struct nodeOperator {

        bool isNodeOperator;
        address[] delegations;
        mapping(address => bool) isDelegating;
        uint256 stakeAmount;
        uint256 referralAmount;
        uint256 POWAmount;
        address delegatorLink;
        bool noDelegations;
        bool isCPA;
    }

    mapping(address => nodeOperator) public nodeOpStruct;



    bytes32 public constant CONTROLLER_ROLE = keccak256("CONTROLLER_ROLE");
    bytes32 public constant SETTER_ROLE =  keccak256("SETTER_ROLE");


    event LogNodeOperatorCreated(address indexed user);
    event LogNodeOperatorCancelled(address indexed user);
    event LogCPACreated(address indexed user);
    event LogCPACancelled(address indexed user);
    event LogNoFollowSet(address indexed user);
    event LogNoFollowRemoved(address indexed user);
    event LogRemoveDelegation(address indexed delegating, address indexed delegatee);
    event LogDelegation(address indexed delegating, address indexed newDelegatee);
    event LogDelegatedStakeRewardsIncreased(address indexed delegating, uint256 amount);
    event LogReferralStakeRewardsIncreased(address indexed delegating, uint256 amount);
    event LogStakingRewardsTransferredOut(address indexed user, uint256 amount);
    event LogStakingRewardsClaimed(address indexed user, uint256 amount);
    event LogStakeRewardsIncreased(address indexed validator, uint256 amount);
    event LogGovernanceUpdate(uint256 params, string indexed action);

    constructor(address _memberHelpers, address _auditToken) {
        require(_memberHelpers != address(0), "NodeOperations:constructor - MemberHelpers address can't be 0");
        require( _auditToken != address(0), "MemberHelpers:setCohort - Cohort address can't be 0");
        memberHelpers = MemberHelpers(_memberHelpers);
        auditToken = _auditToken;
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }


    /// @dev check if caller is a controller
    modifier isController() {
        require(hasRole(CONTROLLER_ROLE, msg.sender), "NodeOperations:IsController - Caller is not a controller");

        _;
    }

    /// @dev check if caller is a setter     
    modifier isSetter {
        require(hasRole(SETTER_ROLE, msg.sender), "NodeOperations:isSetter - Caller is not a setter");

        _;
    }

    function updateStakeRatioDelegating(uint256 _newRatio) public isSetter() {

        require(_newRatio != 0, "NodeOperations:updateStakeRatioDelegating - New value for the stake delegating ratio can't be 0");
        stakeRatioDelegating = _newRatio;

        emit LogGovernanceUpdate(_newRatio, "updateStakeRatioDelegating");
    }

    function updateStakingRatioReferral(uint256 _newRatio) public isSetter() {

        require(_newRatio != 0, "NodeOperations:updateStakingRatioReferral - New value for the stake ratio can't be 0");
        stakingRatioReferral = _newRatio;
        emit LogGovernanceUpdate(_newRatio, "updateStakingRatioReferral");
    }

    function updateStakeRatio(uint256 _newRatio) public isSetter() {

        require(_newRatio != 0, "NodeOperations:updateStakeRatio - New value for the stake ratio can't be 0");
        stakeRatio = _newRatio;
        emit LogGovernanceUpdate(_newRatio, "UpdateStakeRatio");
    }

    function updatePOWFee(uint256 _newFee) public isSetter() {

        require(_newFee != 0, "NodeOperations:updatePOWFee - New value for the POWFee can't be 0");
        POWFee = _newFee;
        emit LogGovernanceUpdate(_newFee, "updatePOWFee");
    }

    function returnDelegatorLink(address operator) public view returns (address){

        return nodeOpStruct[operator].delegatorLink;
    }

    function isNodeOperator(address operator) public view returns (bool) {

        return nodeOpStruct[operator].isNodeOperator;
    }


    function returnPoolList(address poolOperator)public view returns (address[] memory, uint256[] memory) {

        address[] memory poolUsers = new address[](nodeOpStruct[poolOperator].delegations.length  );
        uint256[] memory poolUsersStakes = new uint256[](nodeOpStruct[poolOperator].delegations.length );

        for (uint256 i = 0; i< nodeOpStruct[poolOperator].delegations.length ;i++) {
            poolUsers[i]= nodeOpStruct[poolOperator].delegations[i];
            poolUsersStakes[i] = memberHelpers.returnDepositAmount(poolUsers[i]);

        }
        return (poolUsers, poolUsersStakes);
    }


    function toggleNodeOperator( ) public {

        if (nodeOpStruct[msg.sender].isNodeOperator){
            nodeOpStruct[msg.sender].isNodeOperator = false;
            removeNodeOperator();
            removeAlldelegations();
            emit LogCPACreated(msg.sender);
        }
        else{
            nodeOpStruct[msg.sender].isNodeOperator = true;
            nodeOperators.push(msg.sender);
            emit LogCPACancelled(msg.sender);
        }
    }

    function toggleCPA( ) public {

        if (nodeOpStruct[msg.sender].isCPA){
            nodeOpStruct[msg.sender].isCPA = false;
            removeCPA();
            //TODO:  add remove cohort 
            emit LogNodeOperatorCreated(msg.sender);
        }
        else{
            nodeOpStruct[msg.sender].isCPA = true;
            CPAs.push(msg.sender);
            emit LogNodeOperatorCancelled(msg.sender);
        }
    }

    function toggleNoDelegate( ) public {

        if (nodeOpStruct[msg.sender].noDelegations){
            nodeOpStruct[msg.sender].noDelegations = false;
            removeCPA();
            emit LogNoFollowRemoved(msg.sender);
        }
        else{
            removeAlldelegations();
            nodeOpStruct[msg.sender].noDelegations = true;
            emit LogNoFollowSet(msg.sender);
        }
    }


    function removeCPA() internal {

        for (uint256 i= 0; i < CPAs.length; i++) {

            if (CPAs[i] == msg.sender){

                CPAs[i] = CPAs[CPAs.length - 1];
                CPAs.pop();
                i = CPAs.length;
            }
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


    function returnNodeOperators() public view returns (address[] memory) {

        return nodeOperators;
    }

    function returnCPAs() public view returns (address[] memory) {

        return CPAs;
    }
    

    function removeAlldelegations() public {

        for (uint256 i = nodeOpStruct[msg.sender].delegations.length  ; i > 0; i--) {
            address delegating = nodeOpStruct[msg.sender].delegations[i-1];
            nodeOpStruct[msg.sender].delegations.pop();   
            nodeOpStruct[msg.sender].isDelegating[delegating] = false;
            nodeOpStruct[delegating].delegatorLink = address(0x0);
        }
    }


     function removeDelegation() public {

        address oldDelegatee = nodeOpStruct[msg.sender].delegatorLink;

        require(oldDelegatee != address(0x0), "NodeOperations:removeDelegation You are not delegating your stake yet.");


        for (uint256 i = 0; i < nodeOpStruct[oldDelegatee].delegations.length; i++) {
            if (nodeOpStruct[oldDelegatee].delegations[i] == msg.sender) {
                nodeOpStruct[oldDelegatee].delegations[i] = nodeOpStruct[oldDelegatee].delegations[nodeOpStruct[oldDelegatee].delegations.length - 1];
                nodeOpStruct[oldDelegatee].delegations.pop();
                nodeOpStruct[oldDelegatee].isDelegating[msg.sender] = false;
                nodeOpStruct[msg.sender].delegatorLink = address(0x0);
                i= nodeOpStruct[oldDelegatee].delegations.length;
            }
        }

        emit LogRemoveDelegation(msg.sender, oldDelegatee);
    }


     function delegate(address delegatee) public {

        require(!nodeOpStruct[msg.sender].isNodeOperator, "NodeOperations:delegagte - You are a node operator, first cancel this role and then delegate again. ");
        require(!nodeOpStruct[delegatee].isDelegating[msg.sender], 
          "NodeOperations:delegate - You are already delegating to this member."
        );

        if (nodeOpStruct[msg.sender].delegatorLink != address(0x0)) 
            removeDelegation();

        nodeOpStruct[delegatee].delegations.push(msg.sender);
        nodeOpStruct[msg.sender].delegatorLink = delegatee;
        nodeOpStruct[delegatee].isDelegating[msg.sender] = true;

        emit LogDelegation(msg.sender, delegatee);
    }


    function increasePOWRewards(address validator, uint256 amount) public isController() {
            nodeOpStruct[validator].POWAmount = nodeOpStruct[validator].POWAmount.add(amount);
    }


    function increaseDelegatedStakeRewards(address validator) public isController() {
        uint256 referringReward;

        for (uint256 i = 0; i < nodeOpStruct[validator].delegations.length ; i++) {
            address delegating = nodeOpStruct[validator].delegations[i];
            uint256 amount = memberHelpers.returnDepositAmount(delegating).div(stakeRatioDelegating);
            nodeOpStruct[delegating].stakeAmount = nodeOpStruct[delegating].stakeAmount.add(amount);
            referringReward = referringReward.add(memberHelpers.returnDepositAmount(delegating).div(stakingRatioReferral)
            );
            emit LogDelegatedStakeRewardsIncreased(delegating, amount);
        }

        if (referringReward > 0) {
            nodeOpStruct[validator].referralAmount = nodeOpStruct[validator].referralAmount.add(referringReward);
            emit LogReferralStakeRewardsIncreased(validator, referringReward);
        }
    }


    function claimStakeRewards(bool deliver) public {
        uint256 stakeRewards = nodeOpStruct[msg.sender].stakeAmount;
        uint256 powRewards = nodeOpStruct[msg.sender].POWAmount;
        uint256 refRewards = nodeOpStruct[msg.sender].referralAmount;

        uint256 payment = stakeRewards.add(powRewards).add(refRewards);
        nodeOpStruct[msg.sender].stakeAmount= 0;
        nodeOpStruct[msg.sender].POWAmount = 0;
        nodeOpStruct[msg.sender].referralAmount = 0;

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

        // [validator] = stakstakeAmounteAmount[validator].add(amount);
        nodeOpStruct[validator].stakeAmount = nodeOpStruct[validator].stakeAmount.add(amount);
        emit LogStakeRewardsIncreased(validator, amount);
    }

}
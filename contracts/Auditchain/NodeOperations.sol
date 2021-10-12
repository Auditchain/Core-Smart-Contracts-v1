// SPDX-License-Identifier: MIT
pragma solidity =0.8.0;
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./../IAuditToken.sol";
import "./MemberHelpers.sol";



/**
 * @title NodeOperations
 * Additional function for Members
 */
contract NodeOperations is AccessControl {

    using SafeMath for uint256;

    MemberHelpers public memberHelpers;
    address public auditToken;          
    Members public members;

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
        uint256 delegateAmount;
        uint256 referralAmount;
        uint256 POWAmount;
        address delegatorLink;
        bool noDelegations;
        bool isCPA;
    }

    mapping(address => nodeOperator) public nodeOpStruct;



    bytes32 public constant CONTROLLER_ROLE = keccak256("CONTROLLER_ROLE");
    bytes32 public constant SETTER_ROLE =  keccak256("SETTER_ROLE");


    event LogNodeOperatorToggled(address indexed user, string action);
    event LogCPAToggled(address indexed user, string action);
    event LogNoDelegateToggled(address indexed user, string action);
    event LogRemoveDelegation(address indexed delegating, address indexed delegatee);
    event LogDelegation(address indexed delegating, address indexed newDelegatee);
    event LogDelegatedStakeRewardsIncreased(address indexed delegating, uint256 amount);
    event LogReferralStakeRewardsIncreased(address indexed delegating, uint256 amount);
    event LogStakingRewardsTransferredOut(address indexed user, uint256 amount);
    event LogStakingRewardsClaimed(address indexed user, uint256 amount);
    event LogStakeRewardsIncreased(address indexed validator, uint256 amount);
    event LogGovernanceUpdate(uint256 params, string indexed action);

    constructor(address _memberHelpers, address _auditToken, address _members) {
        require(_memberHelpers != address(0), "NodeOperations:constructor - MemberHelpers address can't be 0");
        require( _auditToken != address(0), "MemberHelpers:setCohort - Cohort address can't be 0");
        memberHelpers = MemberHelpers(_memberHelpers);
        auditToken = _auditToken;
        members = Members(_members);
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }



    /// @dev check if caller is a controller
    modifier isController(string memory source) {
        string memory msgError = string(abi.encodePacked("NodeOperations(isController - Modifier):", source, "- Caller is not a controller"));
        require(hasRole(CONTROLLER_ROLE, msg.sender),msgError);

        _;
    }


    /// @dev check if caller is a setter     
    modifier isSetter {
        require(hasRole(SETTER_ROLE, msg.sender), "NodeOperations:isSetter - Caller is not a setter");

        _;
    }

    /// @dev check if user is validator
    modifier isValidator(string memory source) {

        string memory msgError = string(abi.encodePacked("NodeOperations(isValidator- Modifier):", source, "- You are not a validator"));
        require( members.userMap(msg.sender, Members.UserType(1)), msgError);

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

    /*** 
    * @dev return members of the staking pool
    * @param poolOperator - owner of the pool
    * @param name name of the user
    * @return array of users with their deposit values
    */

    function returnPoolList(address poolOperator)public view returns (address[] memory, uint256[] memory) {

        address[] memory poolUsers = new address[](nodeOpStruct[poolOperator].delegations.length  );
        uint256[] memory poolUsersStakes = new uint256[](nodeOpStruct[poolOperator].delegations.length );

        for (uint256 i = 0; i< nodeOpStruct[poolOperator].delegations.length ;i++) {
            poolUsers[i]= nodeOpStruct[poolOperator].delegations[i];
            poolUsersStakes[i] = memberHelpers.returnDepositAmount(poolUsers[i]);

        }
        return (poolUsers, poolUsersStakes);
    }

    
    /// @dev change Node operator status from on to off or the vice versa 
    function toggleNodeOperator( ) public isValidator("toggleNodeOperator") {


        if (nodeOpStruct[msg.sender].isNodeOperator){
            nodeOpStruct[msg.sender].isNodeOperator = false;
            removeNodeOperator();
            removeAlldelegations();
            emit LogNodeOperatorToggled(msg.sender, "OFF");
        }
        else{
            require(memberHelpers.returnDepositAmount(msg.sender) >= memberHelpers.minContribution(), "NodeOperations:toggelNodeOperator - Minimum stake amount not met.");
            nodeOpStruct[msg.sender].isNodeOperator = true;
            nodeOperators.push(msg.sender);
            emit LogNodeOperatorToggled(msg.sender, "ON");
        }
    }

    /// @dev change CPA status from on to off or vice versa
    function toggleCPA( ) public isValidator("toggleCPA") {

        if (nodeOpStruct[msg.sender].isCPA){
            nodeOpStruct[msg.sender].isCPA = false;
            removeCPA();
            emit LogCPAToggled(msg.sender,"OFF");
        }
        else{
            nodeOpStruct[msg.sender].isCPA = true;
            CPAs.push(msg.sender);
            emit LogCPAToggled(msg.sender,"ON");
        }
    }

    /// @dev change no delegate flag from on to off or vice versa
    function toggleNoDelegate( ) isValidator("toggleNoDelegate") public {

        if (nodeOpStruct[msg.sender].noDelegations){
            nodeOpStruct[msg.sender].noDelegations = false;
            emit LogNoDelegateToggled(msg.sender, "OFF");
        }
        else{
            removeAlldelegations();
            nodeOpStruct[msg.sender].noDelegations = true;
            emit LogNoDelegateToggled(msg.sender, "ON");
        }
    }

    /// @dev remove CPA status
    function removeCPA() internal {

        for (uint256 i= 0; i < CPAs.length; i++) {

            if (CPAs[i] == msg.sender){

                CPAs[i] = CPAs[CPAs.length - 1];
                CPAs.pop();
                i = CPAs.length;
            }
        }
    }

    /// @dev remove Node operator status 
    function removeNodeOperator() internal {

        for (uint256 i= 0; i < nodeOperators.length; i++) {

            if (nodeOperators[i] == msg.sender){

                nodeOperators[i] = nodeOperators[nodeOperators.length - 1];
                nodeOperators.pop();
                i = nodeOperators.length;
            }
        }
    }

    /// return all node operators
    function returnNodeOperators() public view returns (address[] memory) {

        return nodeOperators;
    }

    function returnNodeOperatorsCount() public view returns(uint256){

        return nodeOperators.length;
    }

    /// return all CPAs
    function returnCPAs() public view returns (address[] memory) {

        return CPAs;
    }
    
    /// remove all delegations for specific pool operator
    function removeAlldelegations() public {

        for (uint256 i = nodeOpStruct[msg.sender].delegations.length  ; i > 0; i--) {
            address delegating = nodeOpStruct[msg.sender].delegations[i-1];
            nodeOpStruct[msg.sender].delegations.pop();   
            nodeOpStruct[msg.sender].isDelegating[delegating] = false;
            nodeOpStruct[delegating].delegatorLink = address(0x0);
        }
    }

    /// remove delegation for pool member 
    function removeDelegation() public isValidator("removeDelegation") {

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

    /*** 
    * @dev delegate stake to the pool 
    * @param delegatee - owner of the pool 
    */

     function delegate(address delegatee) public isValidator("Delegate") {

        require(!nodeOpStruct[msg.sender].isNodeOperator, "NodeOperations:delegagte - You are a node operator, first cancel this role and then delegate again. ");
        require(!nodeOpStruct[delegatee].isDelegating[msg.sender], "NodeOperations:delegate - You are already delegating to this member.");

        if (nodeOpStruct[msg.sender].delegatorLink != address(0x0)) 
            removeDelegation();

        nodeOpStruct[delegatee].delegations.push(msg.sender);
        nodeOpStruct[msg.sender].delegatorLink = delegatee;
        nodeOpStruct[delegatee].isDelegating[msg.sender] = true;

        emit LogDelegation(msg.sender, delegatee);
    }


    /*** 
    * @dev called by the Validations contract to increase POW amount of winning validator
    * @param validator - winner of the validation task
    * @param amount to aword to validator
    */
    function increasePOWRewards(address validator, uint256 amount) public isController("increasePOWRewards") {
            nodeOpStruct[validator].POWAmount = nodeOpStruct[validator].POWAmount.add(amount);
    }


    /*** 
    * @dev called by the Validations contract to increase delegated stake rewards and referral rewards
    * @param validator - validator for whom values are increased
    */
    function increaseDelegatedStakeRewards(address validator) public isController("increaseDelegatedStakeRewards") {
        uint256 referringReward;

        for (uint256 i = 0; i < nodeOpStruct[validator].delegations.length ; i++) {
            address delegating = nodeOpStruct[validator].delegations[i];
            uint256 amount = memberHelpers.returnDepositAmount(delegating).div(stakeRatioDelegating);
            nodeOpStruct[delegating].delegateAmount = nodeOpStruct[delegating].delegateAmount.add(amount);
            referringReward = referringReward.add(memberHelpers.returnDepositAmount(delegating).div(stakingRatioReferral));
            emit LogDelegatedStakeRewardsIncreased(delegating, amount);
        }

        if (referringReward > 0) {
            nodeOpStruct[validator].referralAmount = nodeOpStruct[validator].referralAmount.add(referringReward);
            emit LogReferralStakeRewardsIncreased(validator, referringReward);
        }
    }

    /*** 
    * @dev called by the Validations contract to increase pool operator stake reward amount
    * @param validator - validator for whom values are increased
    */
    function increaseStakeRewards(address validator) public isController("increaseStakeRewards") {
        uint256 amount = memberHelpers.returnDepositAmount(validator).div(stakeRatio);
        nodeOpStruct[validator].stakeAmount = nodeOpStruct[validator].stakeAmount.add(amount);
        emit LogStakeRewardsIncreased(validator, amount);
    }


    /*** 
    * @dev called by the Validator to claim their reward
    * @param deliver - true if amount should be delivered into the wallet or stake deposit
    */
    function claimStakeRewards(bool deliver) public {
        uint256 stakeRewards = nodeOpStruct[msg.sender].stakeAmount;
        uint256 delegateRewards = nodeOpStruct[msg.sender].delegateAmount;
        uint256 powRewards = nodeOpStruct[msg.sender].POWAmount;
        uint256 refRewards = nodeOpStruct[msg.sender].referralAmount;


        uint256 payment = stakeRewards.add(powRewards).add(refRewards).add(delegateRewards);
        nodeOpStruct[msg.sender].stakeAmount= 0;
        nodeOpStruct[msg.sender].delegateAmount = 0;
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

}
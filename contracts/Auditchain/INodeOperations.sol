// SPDX-License-Identifier: MIT
pragma solidity =0.8.0;    
    
interface INodeOperations {

    function increasePOWRewards(address validator, uint256 amount) external ;
    function increaseStakeRewards(address validator) external;
    function increaseDelegatedStakeRewards(address validator) external;
    function returnNodeOperators() external view returns (address[] memory) ;
    function POWFee() external view returns (uint256);
    function returnDelegatorLink(address operator) external view returns (address);
    function isNodeOperator(address operator) external view returns (bool);
    function returnNodeOperatorsCount() external view returns (uint256);

}
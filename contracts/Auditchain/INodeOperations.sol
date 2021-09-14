// SPDX-License-Identifier: MIT
pragma solidity =0.8.0;    
    
interface INodeOperations {

    function delegatorLink(address delegatee) external view returns (address);
    function increasePOWRewards(address validator, uint256 amount) external ;
    function increaseStakeRewards(address validator) external;
    function increaseDelegatedStakeRewards(address validator) external;
    function returnNodeOperators() external view returns (address[] memory) ;
    function POWFee() external view returns (uint256);

}
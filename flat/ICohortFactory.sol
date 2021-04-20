pragma solidity =0.7.6;

// SPDX-License-Identifier: MIT
    
    
interface ICohortFactory {

    function returnCohorts(address enterprise) external view returns (address[] memory, uint256[] memory);
    function returnOutstandingValidations() external view returns(uint256);
}
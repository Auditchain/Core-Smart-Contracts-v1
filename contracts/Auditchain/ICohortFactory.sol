// SPDX-License-Identifier: MIT
pragma solidity =0.7.6;    
    
interface ICohortFactory {

    function returnCohorts(address enterprise) external view returns (address[] memory, uint256[] memory);
    function returnOutstandingValidations() external view returns(uint256);
}

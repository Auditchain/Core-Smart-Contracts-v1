pragma solidity =0.8.0;

// SPDX-License-Identifier: MIT
    
    
interface ICohortFactory {

    function returnCohorts(address enterprise) external view returns (address[] memory, uint256[] memory);
    function returnValidatorList(address enterprise, uint256 audit)external view returns(address[] memory);

}
pragma solidity =0.8.0;

// SPDX-License-Identifier: MIT
    
    
interface IValidatinos {

    function outstandingValidations(address enterprise) external view returns (uint256);

}
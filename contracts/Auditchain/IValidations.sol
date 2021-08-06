// SPDX-License-Identifier: MIT
pragma solidity =0.8.0;    
    
interface IValidatinos {

    function outstandingValidations(address enterprise) external view returns (uint256);

}

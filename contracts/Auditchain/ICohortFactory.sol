// SPDX-License-Identifier: MIT
pragma solidity =0.8.0;    
    
interface ICohortFactory {

    function returnCohorts(address enterprise) external view returns (address[] memory, uint256[] memory);
    function returnOutstandingValidations() external view returns(uint256);
    function returnValidatorList(address enterprise, uint256 audit)external view returns(address[] memory);

}

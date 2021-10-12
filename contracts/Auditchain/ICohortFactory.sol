// SPDX-License-Identifier: MIT
pragma solidity =0.8.0;    
    
interface ICohortFactory {

    function returnCohorts(address enterprise) external view returns (address[] memory, uint256[] memory);
    function returnValidatorList(address enterprise, uint256 audit)external view returns(address[] memory);
    function cohortMap(address user, uint256 audit)external view returns(bool);
    function isValidatorInvited(address requestor, address validator, uint256 audit)external view returns(bool, bool);

}

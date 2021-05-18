pragma solidity =0.7.6;

// SPDX-License-Identifier: MIT

    
interface ICohort {
    function resetOutstandingValidations() external;
    function enterprise() external returns (address);
    function outstandingValidations() external view returns (uint256);
    function returnValidators() external view returns(address[] memory);
    function addAdditionalValidator(address additionalValidator) external returns (bool);
    function removeValidator(address validator, address _enterprise) external returns (bool);
    function validations(bytes32 validationHash) external returns ( uint256, uint256, string memory, uint256 consensus);
}
// SPDX-License-Identifier: MIT
pragma solidity =0.8.0;
    
interface ICohort {
    function outstandingValidations(address enterprise) external view returns (uint256);

    function resetOutstandingValidations() external;
    function enterprise() external returns (address);
    function returnValidators() external view returns(address[] memory);
    function addAdditionalValidator(address additionalValidator) external returns (bool);
    function removeValidator(address validator, address _enterprise) external returns (bool);
    function validations(bytes32 validationHash) external returns ( uint256, uint256, string memory, uint256 consensus);
    
}

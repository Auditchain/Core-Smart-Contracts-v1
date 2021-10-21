// SPDX-License-Identifier: MIT
pragma solidity =0.8.0;    
    
interface IValidatinosHelpers {

    function isHashAndTimeCorrect( bytes32 documentHash, uint256 _validationTime) external view returns (bool);
    function returnWinnerStruct(bytes32 validationHash, address contractAddress)external view returns (string memory valUrl, address winner);
    function selectWinner(bytes32 validationHash, address[] memory winners) external view returns (address);
    function determineWinners(bytes32 validationHash) external view returns (address[] memory, uint256);
    function calculateVoteQuorum(bytes32 validationHash, address validationContract) external  view returns (uint256);

}
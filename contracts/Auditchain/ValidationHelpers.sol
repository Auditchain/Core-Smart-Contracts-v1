// SPDX-License-Identifier: MIT
pragma solidity =0.8.0;

import "./IValidations.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./MemberHelpers.sol";



contract ValidationHelpers {

    using SafeMath for uint256;

    // Validation can be approved or disapproved. Initial status is undefined.
    enum ValidationStatus {Undefined, Yes, No}   
    MemberHelpers memberHelpers;
    // address validationCohort;
    // address validationNoCohort;

    constructor(address _memberHelpers)  {

        memberHelpers = MemberHelpers(_memberHelpers);
        // validationCohort = _validationCohort;
        // validationNoCohort = _validationNoCohort;
    }


    function isHashAndTimeCorrect( bytes32 documentHash, uint256 _validationTime) public  view returns (bool){


        bytes32 validationHash = keccak256(abi.encodePacked(documentHash, _validationTime));

        (,,uint validationTime,,,,,,,) = IValidations(msg.sender).returnValidationRecord(validationHash);
        if (validationTime == _validationTime)
            return true;
        else
            return false;
    }


    function returnWinnerStruct(bytes32 validationHash, address contractAddress)public view returns (string memory valUrl, address winner, uint256 validationTime){

        
        (,,validationTime,,,,,,,winner) = IValidations(contractAddress).returnValidationRecord(validationHash);
        valUrl = IValidations(contractAddress).returnValidationUrl(validationHash, winner);

        return (valUrl, winner, validationTime);

    }


    function selectWinner(bytes32 validationHash, address[] memory winners) public view returns (address) {

        address winner = winners[0];

        for (uint8 i=1; i < winners.length; i++){
           (uint256 plus, uint256 minus) =  IValidations(msg.sender).returnWinnerPoints(validationHash, winners[i]);
           (uint256 plusBefore, uint256 minusBefore) =  IValidations(msg.sender).returnWinnerPoints(validationHash, winners[i-1]);

            if (plus > minus)
                if (plus.sub(minus) > plusBefore.sub(minusBefore))
                    {winner = winners[i];}
        }
        return winner;
    }


     function determineWinners(bytes32 validationHash) public  view returns (address[] memory, uint256){

        (address[] memory validator, uint256[] memory status, uint256[] memory validationTimes) = insertionSort (validationHash);

        uint256 consensus = determineConsensus(status);
        bool[] memory isWinner = new bool[](validator.length);
        bool done;
        uint256 i=0;
        uint256 topValidationTime = validationTimes[0];
        uint256 numFound=0;
        
        while (!done) {
            if (uint256(status[i]) == consensus && validationTimes[i] == topValidationTime){
                isWinner[i] = true;
                numFound ++;
            } 
         
            if (i + 1 == validator.length)
                done = true;
            else
                i++;
          }
        
        address[] memory winners = new address[](numFound);
        uint256 j;

        for (uint256 k = 0; k< validator.length; k++){

            if (isWinner[k]){
                winners[j] = validator[k];
                j++;
            }
        }
        return (winners, consensus);
    }



 function insertionSort(bytes32 validationHash) internal view returns (address[] memory, uint256[] memory, uint256[] memory) {

        (address[] memory validator, ,uint256[] memory status, uint256[] memory validationTimes,,) =  IValidations(msg.sender).collectValidationResults(validationHash);

        uint length = validationTimes.length;
        
        for (uint i = 1; i < length; i++) {
            
            uint key = validationTimes[i];
            address user = validator[i];
            uint256 choice = status[i];
            uint j = i - 1;
            while ((int(j) > 0) && (validationTimes[j] > key)) {
                validationTimes[i] = validationTimes[j];
                validationTimes[i-1] = key; 
                validator[i] = validator[j];
                validator[i-1] = user;
                status[i] = status[j];
                status[i-1] =  choice; 
                j--;
            }
            validationTimes[j + 1] = key;
            validator[j+1] = user;
            status[j+1] = choice;
        }

        return (validator, status, validationTimes );
    }



 function determineConsensus(uint256[] memory validation) public pure returns(uint256 ) {

        uint256 yes;
        uint256 no;

        for (uint256 i=0; i< validation.length; i++) {

            if (validation[i] == uint256(ValidationStatus.Yes))
                yes++;
            else
                no++;
        }

        if (yes > no)
            return 1; // consensus is to approve
        else if (no > yes)
            return 2; // consensus is to disapprove
        else
            return 2; // consensus is tie - should not happen
    }

    /**
     * @dev to calculate state of the quorum for the validation
     * @param validationHash - consist of hash of hashed document and timestamp
     * @return number representing current participation level in percentage
     */
    function calculateVoteQuorum(bytes32 validationHash, address validationContract)public view returns (uint256)
    {


        uint256 totalStaked;
        uint256 currentlyVoted;

        // address  contractToCall = determineCaller(chort);

        address[] memory validatorsList = IValidations(validationContract).returnValidatorList(validationHash);
        // (,,uint validationTime,,,,,,,) = IValidations(validationContract).returnValidationRecord(validationHash);
        (address[] memory validatorListActive, ,uint256[] memory choice,,,) =  IValidations(validationContract).collectValidationResults(validationHash);

        // Validation storage validation = validations[validationHash];
        // require(validationTime> 0, "ValidationHelpers:calculateVoteQuorum - Validation hash doesn't exist");

        for (uint256 i = 0; i < validatorsList.length; i++) {
            totalStaked += memberHelpers.returnDepositAmount(validatorsList[i]);
            // if (choice.length <= i) 
             for (uint256 j=0; j< choice.length; j++){
                 if (validatorsList[i] == validatorListActive[j])
                    currentlyVoted += memberHelpers.returnDepositAmount(validatorsList[i]);
             }
        }
        if (currentlyVoted == 0)
            return 0;
        else
           return (currentlyVoted * 100).div(totalStaked);

    }

}
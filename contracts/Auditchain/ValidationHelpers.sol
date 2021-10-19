// SPDX-License-Identifier: MIT
pragma solidity =0.8.0;

import "./IValidations.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";



contract ValidationHelpers {

    IValidations validations;
    using SafeMath for uint256;

       // Validation can be approved or disapproved. Initial status is undefined.
    enum ValidationStatus {Undefined, Yes, No}   


    constructor(address validationsAddress) {

        validations = IValidations(validationsAddress);
    }



    function isHashAndTimeCorrect( bytes32 documentHash, uint256 _validationTime) public view returns (bool){

        bytes32 validationHash = keccak256(abi.encodePacked(documentHash, _validationTime));

        (,,uint validationTime,,,,,,,) = validations.returnValidationRecord(validationHash);
        if (validationTime == _validationTime)
            return true;
        else
            return false;
    }


    function returnWinnerStruct(bytes32 validationHash)public view returns (string memory valUrl, address winner){

        (,,,,,,,,,winner) = validations.returnValidationRecord(validationHash);
        valUrl = validations.returnValidationUrl(validationHash, winner);

    }


    function selectWinner(bytes32 validationHash, address[] memory winners) internal view returns (address) {

        address winner = winners[0];

        for (uint8 i=1; i < winners.length; i++){
           (uint256 plus, uint256 minus) =  validations.returnWinnerPoints(validationHash, winners[i]);
           (uint256 plusBefore, uint256 minusBefore) =  validations.returnWinnerPoints(validationHash, winners[i-1]);

            if (plus > minus)
                if (plus.sub(minus) > plusBefore.sub(minusBefore))
                    {winner = winners[i];}
        }
        return winner;
    }


     function determineWinners(bytes32 validationHash) public view returns (address[] memory, uint256){

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

        (address[] memory validator, ,uint256[] memory status, uint256[] memory validationTimes,,) =  validations.collectValidationResults(validationHash);

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

}
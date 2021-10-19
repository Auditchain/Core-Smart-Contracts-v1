// SPDX-License-Identifier: MIT
pragma solidity =0.8.0;

import "./Validations.sol";


contract ValidationHelpers {

    Validations validations;
    


    constructor(address validationsAddress) {

        validations = Validations(validationsAddress);
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


    function selectWinner(bytes32 validationHash, address[] memory winners) internal returns (address) {

        address winner = winners[0];

        for (uint8 i=1; i < winners.length; i++){
           (uint256 plus, uint256 minus) =  validations.returnWinnerPoints(validationHash, winners[i]);
           (uint256 plusBefore, uint256 minusBefore) =  validations.returnWinnerPoints(validationHash, winners[i-1]);

            if (plus > minus)
                if (
                    plus.sub(validation.winnerVotesMinus[winners[i]]) > 
                    validation.winnerVotesPlus[winners[i-1]].sub(validation.winnerVotesMinus[winners[i-1]])
                    )
                    {winner = winners[i];}
        }
        validation.winner = winner;
        return winner;
    }





}
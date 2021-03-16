// SPDX-License-Identifier: MIT
pragma solidity =0.7.6;
import "./Members.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract MemberHelpers is  AccessControl {

    Members members;


    constructor(address  _members ) {

        require(_members != address(0), "MemberHelpers:constructor - Member address can't be 0");
        members = Members(_members);
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /*
    * @dev return name of the enterprise
    * @param enterprise to return the name
    */
    function returnEnterpriseName(address enterprise) public view returns (string memory) {

        for (uint256 i = 0; i < members.returnEnterpriseCount(); i++){
            (address user, string memory name) = members.enterprises(i);

            if (user == enterprise)
                return name;
        }
        return "Not Enterprise";
    }

    /*
    * @dev return name of the validator
    * @param validator to return the name
    */
    function returnValidatorName(address validator) public view returns (string memory) {

        for (uint256 i = 0; i < members.returnValidatorCount(); i++){

            (address user, string memory name) = members.validators(i);
            if (user == validator)
                return name;
        }
        return "Not Validator";
    }
    

    /*
    * @dev return name of the data subscriber
    * @param validator to return the name
    */
    function returnDataSubscriberName(address dataSubscribers) public view returns (string memory) {

        for (uint256 i = 0; i < members.returnDataSubscriberCount(); i++){
            (address user, string memory name) = members.dataSubscribers(i);
            if (user == dataSubscribers)
                return name;
        }
        return "Not Data Subscriber";
    }
}
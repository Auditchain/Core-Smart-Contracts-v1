// SPDX-License-Identifier: MIT
pragma solidity =0.7.6;
import "./Members.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title MemberHelpers
 * Additional function for Members 
 */
contract MemberHelpers is  AccessControl {

    bytes32 public constant SETTER_ROLE =  keccak256("SETTER_ROLE");
    uint256 public minDepositDays = 30;

 

    event LogUpdateMinDepositDays(uint256 minDepositDays);

    Members members;

    constructor(address  _members ) {
        require(_members != address(0), "MemberHelpers:constructor - Member address can't be 0");
        members = Members(_members);
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }


   /// @dev check if caller is a setter     
    modifier isSetter {
        require(hasRole(SETTER_ROLE, msg.sender), "Members:isSetter - Caller is not a setter");

        _;
    }

    
    // /*
    // * @dev return name of the enterprise
    // * @param enterprise to return the name
    // */
    // function returnEnterpriseName(address enterprise) public view returns (string memory) {

    //     for (uint256 i = 0; i < members.enterpriseCount(); i++){
    //         (address user, string memory name) = members.enterprises(i);

    //         if (user == enterprise)
    //             return name;
    //     }
    //     return "Not Enterprise";
    // }

    // /*
    // * @dev return name of the validator
    // * @param validator to return the name
    // */
    // function returnValidatorName(address validator) public view returns (string memory) {

    //     for (uint256 i = 0; i < members.returnValidatorCount(); i++){

    //         (address user, string memory name) = members.validators(i);
    //         if (user == validator)
    //             return name;
    //     }
    //     return "Not Validator";
    // }
    

    // /*
    // * @dev return name of the data subscriber
    // * @param validator to return the name
    // */
    // function returnDataSubscriberName(address dataSubscribers) public view returns (string memory) {

    //     for (uint256 i = 0; i < members.returnDataSubscriberCount(); i++){
    //         (address user, string memory name) = members.dataSubscribers(i);
    //         if (user == dataSubscribers)
    //             return name;
    //     }
    //     return "Not Data Subscriber";
    // }


    /**
    * @dev to be called by Governance contract to update days to calculate enterprise min deposit requirements
    * @param _minDepositDays new value of min deposit days
    */
    function updateMinDepositDays(uint256 _minDepositDays) public isSetter()  {

        require(_minDepositDays != 0, "Members:updateMinDepositDays - New value for the min deposit days can't be 0");
        minDepositDays = _minDepositDays;
        emit LogUpdateMinDepositDays(_minDepositDays);
    }

    
}
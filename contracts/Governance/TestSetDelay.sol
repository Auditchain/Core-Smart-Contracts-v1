// SPDX-License-Identifier: MIT
pragma solidity =0.7.6;


contract TestSetDelay {
    
    uint public delay;
    address public newAddress;
    
    constructor(uint256 _delay){
        delay = _delay;
    }

    function setDelay(address t, uint256 delay_) public  {
       
        delay = delay_;
        newAddress = t;
        // require(delay==1, "");
              
    }
}

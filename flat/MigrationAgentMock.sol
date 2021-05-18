pragma solidity >=0.7.0 <0.8.0;

// SPDX-License-Identifier: MIT


/// @title Migration Agent interface
abstract contract MigrationAgent {

    function migrateFrom(address _from, uint256 _value) public virtual;
}

// SPDX-License-Identifier: MIT




/// @title Migration Agent interface
contract MigrationAgentMock {

    mapping(address => uint) public balances;

    event AgentDeployed(address user);


    constructor () {

        emit AgentDeployed(msg.sender);
    }

    function migrateFrom(address _from, uint256 _value) public {

        balances[_from] = _value;
        
    }
}
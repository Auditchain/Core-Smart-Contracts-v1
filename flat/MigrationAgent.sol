pragma solidity >=0.6.0 <0.8.0;

// SPDX-License-Identifier: MIT


/// @title Migration Agent interface
abstract contract MigrationAgent {

    function migrateFrom(address _from, uint256 _value) public virtual;
}
// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.8.0;

/// @title Migration Agent interface
abstract contract MigrationAgent {

    function migrateFrom(address _from, uint256 _value) public virtual;
}
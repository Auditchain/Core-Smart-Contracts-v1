// SPDX-License-Identifier: MIT
pragma solidity =0.7.6;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "../Auditchain/ICohort.sol";

/**
 * @title RulesERC721Token
 * RulesERC721Token - ERC721 contract that and has minting functionality.
 */
contract RulesERC721Token is ERC721
{
    using SafeMath for uint256;
    ICohort cohort;

    mapping(bytes32 => bool) public NFTCompleted;
    event Mint(uint256 tokenId, address recipient);

    constructor(string memory _name, string memory _symbol)
        ERC721(_name, _symbol)
    {
        
    }

    /**
     * @dev Mints a token to an enterprise/rule creator with a given validation hash and cohort
     * @param _hash of the validated document
     * @param _cohort address of the cohort
     * @return newTokenId
     */
    function mintTo(bytes32 _hash, address _cohort)
        public
        returns (uint256)
    {
        cohort = ICohort(_cohort);
        (,uint256 executionTime , string memory url, uint256 consensus) = cohort.validations(_hash);
        address enterprise = cohort.enterprise();
        require(enterprise != address(0), "RulesERC721Token:mintTo - Recipient address can't be 0");
        require(executionTime > 0 , "RulesERC721Token:mintTo - This rule hasn't been approved yet");
        require(consensus == 1,  "RulesERC721Token:mintTo - This rule hasn't received sufficient quorum yet");
        require(!NFTCompleted[_hash], "RulesERC721Token:mintTo  - This token has been already claimed");
        uint256 newTokenId = _getNextTokenId();
        _safeMint(enterprise, newTokenId);
        _setTokenURI(newTokenId, url);
        NFTCompleted[_hash] = true;
        emit Mint(newTokenId, enterprise);
        return newTokenId;
    }

    function _getNextTokenId() private view returns (uint256) {
        return totalSupply().add(1);
    }


}

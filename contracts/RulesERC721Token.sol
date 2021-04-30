// SPDX-License-Identifier: MIT
pragma solidity =0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title RulesERC721Token
 * RulesERC721Token - ERC721 contract that and has minting functionality.
 */
contract RulesERC721Token is
    ERC721,
    ERC721Enumerable,
    ERC721URIStorage,
    AccessControlEnumerable
{
    using SafeMath for uint256;

    // mapping (uint=>string) public tokenURI;

    string public baseURI = "";

    event Mint(uint256 _tokenId, address _recipient);

    modifier isAdmin {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "RulesERC721Token:isAdmin - Caller is not an admin"
        );

        _;
    }

    function baseTokenURI() public view returns (string memory) {
        return baseURI;
    }

    function tokenURI(uint256 tokenId)
        public
        view
        virtual
        override(ERC721URIStorage, ERC721)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function _burn(uint256 tokenId)
        internal
        virtual
        override(ERC721URIStorage, ERC721)
    {
        return super._burn(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721, ERC721Enumerable, AccessControlEnumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    constructor(string memory _name, string memory _symbol)
        ERC721(_name, _symbol)
    {

        _setupRole( DEFAULT_ADMIN_ROLE , msg.sender);
    }

    /**
     * @dev Mints a token to an address with a tokenURI.
     * @param _to address of the future owner of the token
     * @return newTokenId
     */
    function mintTo(address _to, string memory _metaDataFileURL)
        public
        isAdmin
        returns (uint256)
    {
        uint256 newTokenId = _getNextTokenId();
        _safeMint(_to, newTokenId);
        _setTokenURI(newTokenId, _metaDataFileURL);
        emit Mint(newTokenId, _to);
        return newTokenId;
    }

    function _getNextTokenId() private view returns (uint256) {
        return totalSupply().add(1);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId);
    }
}

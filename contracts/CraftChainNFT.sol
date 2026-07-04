// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title CraftChainNFT - Authenticity certificate for Indian handicrafts
/// @notice Each token represents ONE authentic handicraft product minted by an NGO on behalf of an artisan.
contract CraftChainNFT is ERC721URIStorage, Ownable {
    uint256 private _nextTokenId = 1;

    // tokenId => mint timestamp (block time)
    mapping(uint256 => uint256) public mintedAt;
    // tokenId => artisan wallet address (for on-chain provenance)
    mapping(uint256 => address) public artisanOf;

    event ProductMinted(uint256 indexed tokenId, address indexed artisan, string tokenURI, uint256 timestamp);
    event ProductVerified(uint256 indexed tokenId, address indexed viewer, uint256 timestamp);
    event OwnershipTransferred(uint256 indexed tokenId, address indexed from, address indexed to, uint256 timestamp);

    constructor(address initialOwner) ERC721("CraftChain Authenticity", "CRAFT") Ownable(initialOwner) {}

    /// @notice Mint a new product NFT. Only the contract owner (backend wallet acting as NGO) can call.
    function mintProduct(address artisan, string memory _tokenURI) external onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId;
        _nextTokenId += 1;

        // The NFT is initially held by the contract owner (NGO custody) so it can be transferred on purchase.
        _safeMint(owner(), tokenId);
        _setTokenURI(tokenId, _tokenURI);
        mintedAt[tokenId] = block.timestamp;
        artisanOf[tokenId] = artisan;

        emit ProductMinted(tokenId, artisan, _tokenURI, block.timestamp);
        return tokenId;
    }

    /// @notice Public view returning full authenticity data for a tokenId.
    function verifyProduct(uint256 tokenId)
        external
        view
        returns (address currentOwner, address artisan, uint256 timestamp, string memory uri)
    {
        require(_ownerOf(tokenId) != address(0), "CraftChain: token does not exist");
        return (ownerOf(tokenId), artisanOf[tokenId], mintedAt[tokenId], tokenURI(tokenId));
    }

    /// @notice Transfer ownership on purchase. Callable by contract owner or current holder.
    function transferProduct(uint256 tokenId, address newOwner) external {
        address currentOwner = ownerOf(tokenId);
        require(msg.sender == owner() || msg.sender == currentOwner, "CraftChain: not authorized");
        require(newOwner != address(0), "CraftChain: invalid new owner");
        _transfer(currentOwner, newOwner, tokenId);
        emit OwnershipTransferred(tokenId, currentOwner, newOwner, block.timestamp);
    }

    function totalMinted() external view returns (uint256) {
        return _nextTokenId - 1;
    }
}

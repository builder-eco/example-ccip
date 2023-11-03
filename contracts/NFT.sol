// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./SignatureVerifier.sol";
import "hardhat/console.sol";

contract NFT is ERC721, Ownable {
    error InvalidOperation();
    error OffchainLookup(
        address sender,
        string[] urls,
        bytes callData,
        bytes4 callbackFunction,
        bytes extraData
    );

    mapping(address => bool) public signers;
    mapping(bytes32 => bool) public usedClaims;

    /**
     * NFT Template from OpenZeppelin
     **/
    uint256 private _nextTokenId;

    constructor() ERC721("NFT", "NFT") {}

    function setSigner(address signer, bool isSigner) public onlyOwner {
        signers[signer] = isSigner;
    }

    /**
     * Custom Claim function
     **/
    function claim(bytes calldata response, bytes calldata extraData) public {
        uint256 tokenId = resolveClaimRemote(response, extraData);

        bytes32 claimHash = keccak256(response);
        require(
            !_exists(tokenId) && !usedClaims[claimHash],
            "tokenId already claimed"
        );

        usedClaims[claimHash] = true;
        _safeMint(msg.sender, tokenId);
    }

    function burn(uint256 tokenId) public {
        require(ownerOf(tokenId) == msg.sender, "must be owner");
        _burn(tokenId);
    }

    /**
     * Resolves a tokenId to claim data
     * @param claimId An identifier for requesting the claim
     * @return The return data, ABI encoded identically to the underlying function.
     */
    function resolveClaim(
        bytes calldata claimId
    ) external view returns (uint256) {
        string[] memory urls = new string[](1);
        urls[0] = "https://server-worker.cloudflare3563.workers.dev";
        revert OffchainLookup(
            address(this),
            urls,
            claimId,
            this.resolveClaimRemote.selector,
            ""
        );
    }

    /**
     * Callback used by CCIP read compatible clients to verify and parse the response.
     */
    function resolveClaimRemote(
        bytes calldata response,
        bytes calldata extraData
    ) public view returns (uint256) {
        (address signer, bytes memory result) = SignatureVerifier.verify(
            address(this),
            extraData,
            response
        );
        require(signers[signer], "SignatureVerifier: Invalid sigature");
        bytes memory tokenIdBytes = abi.decode(result, (bytes));
        uint256 tokenId = bytesToUint256(tokenIdBytes);
        return tokenId;
    }

    function bytesToUint256(bytes memory data) public pure returns (uint256) {
        require(data.length >= 1, "Input bytes must have at least one byte");

        uint256 result = 0;

        for (uint256 i = 0; i < data.length; i++) {
            result = result * 256 + uint256(uint8(data[i]));
        }

        return result;
    }
}

import { expect } from "chai";
import { type Contract } from "ethers";
import { ethers } from "hardhat";

const SIGNER_PRIVATE_KEY = "0x1d5a20a03913d1c6980c1a38aa7e161c41b487ce200ec46e6bea9e7a1d2d3f1d"
const signer = new ethers.utils.SigningKey(SIGNER_PRIVATE_KEY);

describe("NFT", function () {
  async function deployNft() {
    const [owner, otherAccount] = await ethers.getSigners();

    const NFT = await ethers.getContractFactory("NFT");
    const nft = await NFT.deploy();

    const signerAddress = ethers.utils.computeAddress(signer.publicKey);

    await nft.connect(owner).setSigner(signerAddress, true);
    await nft.connect(owner).setSigner(owner.address, true);
    return { nft, owner, otherAccount, signer };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { nft, owner } = await deployNft();
      expect(await nft.owner()).to.equal(owner.address);
    });

  });

  describe("resolveClaim(claimId)", function () {
    it("reverts with OffchainLookup", async function () {
      const { nft } = await deployNft()
      await expect(nft.resolveClaim("0x")).to.be.revertedWith("OffchainLookup")
    });

    it("returns contract address", async function () {
      const { nft } = await deployNft()
      try { await nft.resolveClaim("0x01") }
      catch (error: any) { expect(error.errorArgs.sender).to.equal(nft.address) }
    });


    it("returns claimId", async function () {

      const { nft } = await deployNft()
      try { await nft.resolveClaim("0xff") }
      catch (error: any) { expect(error.errorArgs.callData).to.equal("0xff") }
    });

    it("returns empty extraData", async function () {

      const { nft } = await deployNft()
      try { await nft.resolveClaim("0xff") }
      catch (error: any) { expect(error.errorArgs.extraData).to.equal("0x") }
    });

    it("returns callbackFunction for resolveClaimRemote", async function () {

      const { nft } = await deployNft()
      try { await nft.resolveClaim("0xff") }
      catch (error: any) { expect(error.errorArgs.callbackFunction).to.equal(nft.interface.getSighash('resolveClaimRemote')) }
    });
  });

  describe('resolveClaimRemote(response, callData)', function () {
    it('accepts correct data', async function () {
      const { nft } = await deployNft()
      const { response, extraData } = await getSignedResponse('0x00', nft)

      await expect(nft.resolveClaimRemote(response, extraData)).not.to.be.reverted
    })

    it('returns the tokenId', async function () {
      const { nft } = await deployNft()
      const { response, extraData, tokenId } = await getSignedResponse('0x00', nft)

      expect(await nft.resolveClaimRemote(response, extraData)).to.equal(tokenId)
    })

    it('rejects invalid data', async function () {
      const { nft } = await deployNft()
      const { response } = await getSignedResponse('0x00', nft)

      await expect(nft.resolveClaimRemote(response, '0x11')).to.be.reverted
    })
  })

  describe("claim(response, extraData)", function () {
    it("claims a token correctly", async function () {
      const { nft, otherAccount } = await deployNft()
      const { response, extraData, tokenId } = await getSignedResponse('0x00', nft)

      await expect(nft.connect(otherAccount).claim(response, extraData)).not.to.be.reverted

      expect(await nft.balanceOf(otherAccount.address)).to.equal(1)
      expect(await nft.ownerOf(tokenId)).to.equal(otherAccount.address)
    });

    it("allows to claim different tokens", async function () {
      const { nft, otherAccount } = await deployNft()
      const tokenId1 = BigInt(1)
      const response1 = await getSignedResponse('0x00', nft, tokenId1)

      await nft.connect(otherAccount).claim(response1.response, response1.extraData)
      expect(await nft.balanceOf(otherAccount.address)).to.equal(1)
      expect(await nft.ownerOf(tokenId1)).to.equal(otherAccount.address)


      const tokenId2 = BigInt(2)
      const response2 = await getSignedResponse('0x00', nft, tokenId2)

      await nft.connect(otherAccount).claim(response2.response, response2.extraData)
      expect(await nft.balanceOf(otherAccount.address)).to.equal(2)
      expect(await nft.ownerOf(tokenId1)).to.equal(otherAccount.address)
    });

    it("prevents double claims", async function () {
      const { nft, otherAccount } = await deployNft()
      const { response, extraData, tokenId } = await getSignedResponse('0x00', nft)

      await expect(nft.connect(otherAccount).claim(response, extraData)).not.to.be.reverted
      await expect(nft.connect(otherAccount).claim(response, extraData)).be.revertedWith("tokenId already claimed");

      expect(await nft.balanceOf(otherAccount.address)).to.equal(1)
      expect(await nft.ownerOf(tokenId)).to.equal(otherAccount.address)
    });

    it("prevents identical claim after burn", async function () {
      const { nft, otherAccount } = await deployNft()
      const { response, extraData, tokenId } = await getSignedResponse('0x00', nft)

      await expect(nft.connect(otherAccount).claim(response, extraData)).not.to.be.reverted
      await nft.connect(otherAccount).burn(tokenId)
      await expect(nft.connect(otherAccount).claim(response, extraData)).be.revertedWith("tokenId already claimed");

      expect(await nft.balanceOf(otherAccount.address)).to.equal(0)
      await expect(nft.ownerOf(tokenId)).to.be.revertedWith('ERC721: invalid token ID')
    });

    it("supports http fetch signing", async function () {
      const { nft, otherAccount } = await deployNft()
      const { response, extraData, tokenId } = await getSignedResponse('0x00', nft)

      const res = await fetch('https://server-worker.cloudflare3563.workers.dev', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          sender: nft.address,
          data: '0x00'
        })
      })

      const json = await res.json()

      await expect(nft.resolveClaimRemote(response, extraData)).not.to.be.reverted
      await expect(nft.resolveClaimRemote(json.data, extraData)).not.to.be.reverted
    });
  })
});



async function getSignedResponse(claimId: `0x${string}`, nft: Contract, _tokenId?: bigint): Promise<{ callData: string, extraData: string, response: string, tokenId: bigint }> {
  const tokenId = BigInt(_tokenId || 1)
  const tokenIdBytes = ethers.utils.defaultAbiCoder.encode(['bytes'], [Number(tokenId)])
  try { await nft.resolveClaim(claimId) }
  catch (error: any) {

    const validUntil = Math.floor(Date.now() / 1000 + 60)
    const messageHash = ethers.utils.solidityKeccak256(
      ["bytes", "address", "uint64", "bytes32", "bytes32"],
      [
        "0x1900",
        error.errorArgs.sender,
        validUntil,
        ethers.utils.keccak256(error.errorArgs.extraData),
        ethers.utils.keccak256(tokenIdBytes),
      ]
    );

    const sig = signer.signDigest(messageHash);
    const sigData = ethers.utils.hexConcat([sig.r, sig.s, ethers.utils.hexlify(sig.v)])
    const response = ethers.utils.defaultAbiCoder.encode(['bytes', 'uint64', 'bytes'], [tokenIdBytes, validUntil, sigData])

    return { response, tokenId, callData: error.errorArgs.callData, extraData: error.errorArgs.extraData }
  }

  throw new Error('resolveClaim did not throw')
}
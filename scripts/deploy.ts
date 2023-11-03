import hre from "hardhat"


const signerAddress = '0xF31f7C750BfDC4D7ba5Bb47bD9E65DAb071972Ee'
async function main() {
  await hre.run('compile')

  // const SignatureVerifier = await hre.ethers.getContractFactory("SignatureVerifier")
  // const signatureVerifier = await SignatureVerifier.deploy()
  // await signatureVerifier.deployed()
  // console.log("SignatureVerifier deployed to:", signatureVerifier.address)

  const NFT = await hre.ethers.getContractFactory("NFT")
  const nft = await NFT.deploy()

  await nft.deployed()
  console.log("NFT deployed to:", nft.address)

  await nft.setSigner(signerAddress, true)
  console.log("NFT signer set to:", signerAddress)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exit(1)
})

const { ethers } = require('ethers')
const { CCIPReadProvider } = require('@chainlink/ethers-ccip-read-provider')
const url = 'https://gateway.tenderly.co/public/goerli'
const outerProvider = new ethers.providers.JsonRpcProvider(url)
const provider = new CCIPReadProvider(outerProvider);

const address = '0xBf159FBA384CA8CD4888C82cDd264ce1a16aDE46'

async function main() {

    const contract = new ethers.Contract(address, [
        'function resolveClaim(bytes calldata claimId) external view returns (uint256 tokenId)'
    ], provider);

    const claimId = "0xff"
    const tokenId = await contract.callStatic.resolveClaim(claimId)
    console.log('claimId', claimId, 'tokenId', Number(tokenId))
}

main()
    .catch((err) => {
        console.error(err)
        process.exit(1)
    })
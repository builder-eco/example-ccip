import "@nomiclabs/hardhat-waffle"
import "@nomicfoundation/hardhat-verify";

module.exports = {
  solidity: "0.8.19",
  networks: {
    goerli: {
      url: 'https://ethereum-goerli.publicnode.com',
      accounts: ['0x80b97e2ecfab8b1c78100c418328e8a88624e3d19928ec791a8a51cdcf01f16f']
    },
  },
  sourcify: {
    enabled: true
  },
  etherscan: {
    apiKey: ''
  }
};


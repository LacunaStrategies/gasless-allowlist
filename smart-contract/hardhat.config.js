require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-waffle");
require("dotenv").config({ path: ".env" });

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
 module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {},
    rinkeby: {
      url: process.env.MORALIS_RINKEBY_URL,
      accounts: [process.env.RINKEBY_PRIVATE_KEY],
    },
    ropsten: {
      url: process.env.MORALIS_ROPSTEN_URL,
      accounts: [process.env.ROPSTEN_PRIVATE_KEY],
    },
  },
  solidity: {
    version: "0.8.9",
    settings: {
      optimizer: {
        enabled: true,
        runs: 10000
      }
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY
  },
};


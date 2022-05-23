const hre = require("hardhat");

async function main() {

  const Contract = await hre.ethers.getContractFactory("LacunaStrategies");
  const contract = await Contract.deploy(
    "0x1735973008A2Bb92bAcff945aA2594Ce975e0256",
    ["0x08D8e1A0E3263A251dbf36455d6134bD30ABD230"],
    [1]
  );

  await contract.deployed();

  console.log("Contract deployed to:", contract.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

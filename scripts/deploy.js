const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);
  const bal = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Balance:", hre.ethers.formatEther(bal), "ETH");

  const Factory = await hre.ethers.getContractFactory("CraftChainNFT");
  const contract = await Factory.deploy(deployer.address);
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  const tx = contract.deploymentTransaction();
  console.log("CraftChainNFT deployed to:", address);
  console.log("Deployment tx:", tx.hash);

  // Save ABI + address to shared config
  const artifact = await hre.artifacts.readArtifact("CraftChainNFT");
  const out = {
    address,
    deploymentTx: tx.hash,
    deployer: deployer.address,
    chainId: 11155111,
    abi: artifact.abi,
  };
  const outDir = path.join(__dirname, "..", "lib", "contract");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "CraftChainNFT.json"), JSON.stringify(out, null, 2));
  console.log("Saved to lib/contract/CraftChainNFT.json");
}

main().catch((e) => { console.error(e); process.exit(1); });

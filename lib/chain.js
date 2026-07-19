import { ethers } from 'ethers'
import contractJson from './contract/CraftChainNFT.json'

let cachedProvider = null
let cachedSigner = null
let cachedSignerContract = null
let cachedReadContract = null
let cachedDeploymentBlock = null

export function getProvider() {
  if (!cachedProvider) {
    cachedProvider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL)
  }
  return cachedProvider
}

export function getSigner() {
  if (!cachedSigner) {
    cachedSigner = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, getProvider())
  }
  return cachedSigner
}

export function getContract(withSigner = false) {
  if (withSigner) {
    if (!cachedSignerContract) {
      cachedSignerContract = new ethers.Contract(process.env.CONTRACT_ADDRESS, contractJson.abi, getSigner())
    }
    return cachedSignerContract
  }
  if (!cachedReadContract) cachedReadContract = new ethers.Contract(process.env.CONTRACT_ADDRESS, contractJson.abi, getProvider())
  return cachedReadContract
}

export async function getDeploymentBlock() {
  if (cachedDeploymentBlock == null) {
    try {
      const receipt = await getProvider().getTransactionReceipt(contractJson.deploymentTx)
      cachedDeploymentBlock = receipt?.blockNumber || 0
    } catch (e) {
      cachedDeploymentBlock = 0
    }
  }
  return cachedDeploymentBlock
}

export const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS
export const DEPLOYMENT_TX = contractJson.deploymentTx
export const EXPLORER_URL = 'https://sepolia.etherscan.io'
export const ABI = contractJson.abi

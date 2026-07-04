import { ethers } from 'ethers'
import contractJson from './contract/CraftChainNFT.json'

let cachedProvider = null
let cachedSigner = null
let cachedContract = null

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
    if (!cachedContract) {
      cachedContract = new ethers.Contract(
        process.env.CONTRACT_ADDRESS,
        contractJson.abi,
        getSigner()
      )
    }
    return cachedContract
  }
  return new ethers.Contract(process.env.CONTRACT_ADDRESS, contractJson.abi, getProvider())
}

export const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS
export const EXPLORER_URL = 'https://sepolia.etherscan.io'
export const ABI = contractJson.abi

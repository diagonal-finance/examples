import { ethers, providers } from 'ethers'
import environment from '../../environment'

export const getRpcProvider = (): providers.JsonRpcProvider => {
  return new ethers.providers.JsonRpcProvider(environment.RPC_PROVIDER_URL)
}

export const getSigner = (): ethers.utils.SigningKey => {
  return new ethers.utils.SigningKey(environment.SIGNER_PRIVATE_KEY as string)
}

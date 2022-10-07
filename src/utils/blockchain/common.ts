import { ethers, providers } from 'ethers'
import environment from '../../environment'
import { DiagonalOrgV3, DiagonalOrgV3__factory } from '../../typechain'

export const getRpcProvider = (): providers.JsonRpcProvider => {
  return new ethers.providers.JsonRpcProvider(environment.RPC_PROVIDER_URL)
}

export const getSigner = (): ethers.utils.SigningKey => {
  return new ethers.utils.SigningKey(environment.SIGNER_PRIVATE_KEY as string)
}

export const getOrgContractConnection = (
  provider: providers.JsonRpcProvider,
  diagonalOrgAddress: string,
): DiagonalOrgV3 => {
  return DiagonalOrgV3__factory.connect(diagonalOrgAddress, provider)
}

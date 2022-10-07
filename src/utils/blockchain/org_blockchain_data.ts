import { BigNumber, providers } from 'ethers'
import { DiagonalOrgV3 } from '../../typechain'
import { getOrgContractConnection } from './common'

export const getChargeNonce = async (
  provider: providers.JsonRpcProvider,
  source: string,
  diagonalOrgAddr: string,
): Promise<BigNumber> => {
  const diagonalOrg: DiagonalOrgV3 = getOrgContractConnection(
    provider,
    diagonalOrgAddr,
  )

  return await diagonalOrg.chargeNonces(source)
}

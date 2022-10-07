import { ethers, providers } from 'ethers'
import { getSigner } from './blockchain/common'
import { getChargeNonce } from './blockchain/org_blockchain_data'
import { computeEip712ChargeDigest } from './blockchain/org_digests'
import {
  ChargeStruct as Charge,
  SignatureStruct as Signature,
} from '../typechain/DiagonalOrgV3'

export const signCharge = async (
  provider: providers.JsonRpcProvider,
  originalChargeId: string,
  customerAddress: string,
  tokenAddress: string,
  amount: string,
  organizationAddress: string,
) => {
  const chargeId = ethers.utils.id(originalChargeId)
  const charge: Charge = {
    id: chargeId,
    source: customerAddress,
    token: tokenAddress,
    amount: amount,
  }

  return sign(provider, charge, organizationAddress)
}

const sign = async (
  provider: providers.JsonRpcProvider,
  charge: Charge,
  diagonalOrgAddr: string,
): Promise<Signature> => {
  const chargeNonce = await getChargeNonce(
    provider,
    charge.source as string,
    diagonalOrgAddr,
  )
  const chargeDigest = computeEip712ChargeDigest(
    charge,
    diagonalOrgAddr,
    chargeNonce,
    provider.network.chainId,
  )

  const signature = getSigner().signDigest(chargeDigest)

  return {
    v: signature.v,
    r: signature.r,
    s: signature.s,
  }
}

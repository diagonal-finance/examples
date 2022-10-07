import { IWebhookEvent } from '../types/webhook'
import environment from '../environment'
import { ChargeData } from '../types/charge'
import { toBigNumber } from '../utils/conversions'
import { signCharge } from '../utils/sign_charge_request'
import { TOKEN_ADDRESSES, TOKEN_DECIMALS } from '../config'
import { SignatureStruct as Signature } from '../typechain/DiagonalOrgV3'
import fetch from 'cross-fetch'
import { getRpcProvider } from '../utils/blockchain/common'
import { ChainId } from '../types/blockchain'

export const handleChargeSignatureRequestEvent = async (
  event: IWebhookEvent,
): Promise<void> => {
  const chargeData = event.data as ChargeData
  const signature = await getChargeSignature(chargeData)
  await captureCharge(chargeData.id, signature)
}

const getChargeSignature = async (
  chargeData: ChargeData,
): Promise<Signature> => {
  const provider = getRpcProvider()
  const chainId = provider.network.chainId as ChainId
  const tokenDecimals = TOKEN_DECIMALS[chargeData.token][chainId] ?? 18
  const amount = toBigNumber(chargeData.amount, tokenDecimals).toString()

  const organizationContractAddress = environment.ORG_CONTRACT_ADDRESS as string
  const tokenAddress = TOKEN_ADDRESSES[chargeData.token][chainId] as string
  const customerAddress = chargeData.source_address as string
  const chargeId = chargeData.id as string

  const signature = await signCharge(
    provider,
    chargeId,
    customerAddress,
    tokenAddress,
    amount,
    organizationContractAddress,
  )

  return signature
}

const captureCharge = async (
  chargeId: string,
  signature: Signature,
): Promise<void> => {
  const baseURL = environment.DIAGONAL_API_BASE_URL as string
  const apiKey = environment.DIAGONAL_API_KEY as string

  await fetch(`${baseURL}/v1/charges/${chargeId}/capture`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      signature,
    }),
  })
}

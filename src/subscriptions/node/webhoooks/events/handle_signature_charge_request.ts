import * as dotenv from 'dotenv'
import {
  SignatureEvent,
  Diagonal,
  Charge,
  DiagonalError,
} from '@diagonal-finance/sdk'
dotenv.config()

const signingKey = process.env.DIAGONAL_SIGNING_PRIVATE_KEY as string

export const handleChargeSignatureRequest = async (
  diagonal: Diagonal,
  event: SignatureEvent,
): Promise<Charge> => {
  const signatureRequest = event.data
  const charge = signatureRequest.data.charge

  const ecdsaSignature = diagonal.signatures.sign(signatureRequest, signingKey)

  try {
    return await diagonal.charges.capture(charge.id, ecdsaSignature)
  } catch (e) {
    if (e instanceof DiagonalError) {
      // Obtain error information
      // ...
    }
    throw e
  }
}

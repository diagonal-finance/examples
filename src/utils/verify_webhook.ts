import { ISignatureHeader, IWebhookEvent } from '../types/webhook'
import { createHmac } from 'crypto'

export const verifyWebhook = (
  payload: unknown,
  signatureHeader: string,
  endpointSecret: string,
): IWebhookEvent => {
  // throws an error if the payload is invalid
  verifyPayload(payload)

  // throws an error if the endpoint secret is invalid
  verifyEndpointSecret(endpointSecret)

  const parsedSignatureHeader = parseSignatureHeader(signatureHeader)

  // throws an error if the timestamp is too old
  verifySignatureTimestamp(parsedSignatureHeader.timestamp)

  // throws an error if signature is invalid
  verifySignature(
    JSON.stringify(payload),
    parsedSignatureHeader,
    endpointSecret,
  )

  return payload as IWebhookEvent
}

const verifyPayload = (payload: unknown): void => {
  if (typeof payload !== 'object') throw new Error('Invalid payload type')
}

const verifyEndpointSecret = (endpointSecret: string): void => {
  console.log('endpointSecret length', endpointSecret.length)
  if (
    typeof endpointSecret !== 'string' ||
    endpointSecret === '' ||
    endpointSecret.length !== 40
  )
    throw new Error('Invalid endpoint secret')
}

const verifySignatureTimestamp = (signatureTimestamp: string): void => {
  try {
    const timeNowMs = Date.now()
    const signatureTimeMs = parseInt(signatureTimestamp)

    const interval = 5 * 60 * 1000 // 5 minutes
    const diff = timeNowMs - signatureTimeMs

    if (diff > interval) {
      throw new Error('Signature too old.')
    }
  } catch (e) {
    if (e.message === 'Signature too old.') {
      throw e
    }
    throw new Error('Invalid signature timestamp.')
  }
}

const verifySignature = (
  payload: string,
  signatureHeader: ISignatureHeader,
  endpointSecret: string,
): void => {
  try {
    const payloadWithTimestamp = `${payload}${signatureHeader.timestamp}`
    const signedPayload = createHmac('sha256', endpointSecret)
      .update(payloadWithTimestamp)
      .digest('hex')

    if (signedPayload !== signatureHeader.signature) {
      throw new Error('Invalid signature.')
    }
  } catch (e) {
    throw new Error('Invalid signature.')
  }
}

const parseSignatureHeader = (signatureHeader: string): ISignatureHeader => {
  if (!isSignatureHeaderFormatValid(signatureHeader))
    throw new Error('Invalid signature header.')

  const signatureHeaderElements = signatureHeader.split(',') as [string, string]

  const timestamp = signatureHeaderElements[0].split('=')[1]!
  const signature = signatureHeaderElements[1].split('=')[1]!

  const parsedSignatureHeader: ISignatureHeader = {
    timestamp,
    signature,
  }

  return parsedSignatureHeader
}

export const isSignatureHeaderFormatValid = (
  signatureHeader: string,
): boolean => {
  if (typeof signatureHeader !== 'string') return false
  const signatureHeaderElements = signatureHeader.split(',')

  if (signatureHeaderElements.length !== 2) return false
  if (typeof signatureHeaderElements[0] !== 'string') return false
  if (typeof signatureHeaderElements[1] !== 'string') return false

  const timestampFields = signatureHeaderElements[0].split('=')
  const signatureFields = signatureHeaderElements[1].split('=')
  if (timestampFields[0] !== 't') return false
  if (signatureFields[0] !== 'v0') return false

  if (timestampFields[1]?.length !== 13) return false
  if (signatureFields[1]?.length !== 64) return false

  return true
}

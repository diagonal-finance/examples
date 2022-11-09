import {
  Webhooks,
  Event,
  EventType,
  Constants,
  Diagonal,
  DiagonalError,
} from '@diagonal-finance/sdk'

import express from 'express'

const app = express()

app.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    let payload = req.body
    let signatureHeader = req.headers[Constants.SIGNATURE_HEADER_KEY] as string
    const endpointSecret = process.env
      .DIAGONAL_WEBHOOK_ENDPOINT_SECRET as string

    let event: Event

    try {
      event = Webhooks.constructEvent(payload, signatureHeader, endpointSecret)
    } catch (e) {
      if (e instanceof DiagonalError) {
        // Obtain error information
      }
      return res.sendStatus(400)
    }

    if (event.type !== EventType.SIGNATURE_CHARGE_REQUEST)
      return res.sendStatus(200)

    const apiKey = process.env.DIAGONAL_API_KEY as string
    const privateKey = process.env.DIAGONAL_SIGNING_PRIVATE_KEY as string
    const diagonal = new Diagonal(apiKey)

    const signature = event.data
    const charge = signature.data.charge

    const ecdsaSignature = diagonal.signatures.sign(signature, privateKey)

    await diagonal.charges.capture(charge.id, ecdsaSignature)

    // Return a 200 response to acknowledge receipt of the event
    res.sendStatus(200)
  },
)

app.listen(3000, () => console.log('Running on port 3000'))

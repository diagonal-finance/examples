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

    // Handle the event
    switch (event.type) {
      case EventType.SIGNATURE_CHARGE_REQUEST: {
        // Handle the charge signature request here
        const apiKey = process.env.DIAGONAL_API_KEY as string
        const privateKey = process.env.DIAGONAL_SIGNING_PRIVATE_KEY as string
        const diagonal = new Diagonal(apiKey)

        const signature = event.data
        const charge = signature.data.charge

        const ecdsaSignature = diagonal.signatures.sign(signature, privateKey)

        await diagonal.charges.capture(charge.id, ecdsaSignature)
        break
      }
      case EventType.SUBSCRIPTION_CREATED:
        console.log(`Subscription was created`)
        // Handle the subscription creation here
        // ...
        break
      default:
        console.log(`Unhandled event type ${event.type}.`)
        break
    }

    // Return a 200 response to acknowledge receipt of the event
    res.sendStatus(200)
  },
)

app.listen(3000, () => console.log('Running on port 3000'))

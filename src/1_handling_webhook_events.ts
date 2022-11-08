import {
  Constants,
  DiagonalError,
  Event,
  EventType,
  Webhooks,
} from '@diagonal-finance/backend-sdk'

import express from 'express'

const app = express()

app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  let payload = req.body
  let signatureHeader = req.headers[Constants.SIGNATURE_HEADER_KEY] as string
  const endpointSecret = process.env.DIAGONAL_WEBHOOK_ENDPOINT_SECRET as string

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
    case EventType.SIGNATURE_CHARGE_REQUEST:
      console.log(`Charge signature request`)
      // Then define and call a method to handle the charge signature request
      // handleChargeSignatureRequest(event);
      break
    case EventType.SUBSCRIPTION_CREATED:
      console.log(`Subscription was created`)
      // Then define and call a method to handle the subscription created event
      // handleSubscriptionCreated(event);
      break
    default:
      // Unexpected event type
      console.log(`Unhandled event type ${event.type}.`)
  }

  // Return a 200 response to acknowledge receipt of the event
  res.sendStatus(200)
})

app.listen(3000, () => console.log('Running on port 3000'))

import * as dotenv from 'dotenv'
import express, { Request, Response } from 'express'
import {
  Constants,
  DiagonalError,
  Event,
  EventType,
  Webhooks,
} from '@diagonal-finance/sdk'

dotenv.config()

const app = express()

app.use(express.json()) // to support JSON-encoded bodies
app.use(express.urlencoded()) // to support URL-encoded bodies

const endpointSecret = process.env.DIAGONAL_WEBHOOK_ENDPOINT_SECRET as string

app.post('/webhook', (req: Request, res: Response) => {
  let payload = req.body
  let signatureHeader = req.headers[Constants.SIGNATURE_HEADER_KEY] as string

  let event: Event

  try {
    event = Webhooks.constructEvent(payload, signatureHeader, endpointSecret)
  } catch (e) {
    if (e instanceof DiagonalError) {
      // Obtain error information
    }
    return res.sendStatus(400)
  }

  switch (event.type) {
    case EventType.SIGNATURE_CHARGE_REQUEST:
      console.log(`Charge signature request`)
      // Handle the charge signature request here
      // View an example handler:
      // https://docs.diagonal.finance/recipes/sign-and-capture-charge
      break
    case EventType.SUBSCRIPTION_CREATED:
      console.log(`Subscription was created`)
      // Handle the subscription creation here
      // ...
      break
    default:
      // Unexpected event type
      console.log(`Unhandled event type ${event.type}.`)
  }

  // Return a 200 response to acknowledge handling of the event
  res.sendStatus(200)
})

// start the express server
app.listen(3000, () => {
  console.log(`server started at http://localhost:3000`)
})

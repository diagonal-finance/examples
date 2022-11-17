import * as dotenv from 'dotenv'
import express, { Request, Response } from 'express'
import {
  Constants,
  DiagonalError,
  Event,
  EventType,
  Diagonal,
} from '@diagonal-finance/sdk'

dotenv.config()

const app = express()

app.use(express.json()) // to support JSON-encoded bodies
app.use(express.urlencoded()) // to support URL-encoded bodies

const apiKey = process.env.DIAGONAL_API_KEY as string
const endpointSecret = process.env.DIAGONAL_WEBHOOK_ENDPOINT_SECRET as string

const diagonal = new Diagonal(apiKey)

app.post('/webhook', (req: Request, res: Response) => {
  const payload = req.body
  const signatureHeader = req.headers[Constants.SIGNATURE_HEADER_KEY] as string

  let event: Event

  try {
    event = diagonal.webhooks.constructEvent(
      payload,
      signatureHeader,
      endpointSecret,
    )
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
      // Handle the charge signature request event here
      // View an example handler:
      // https://docs.diagonal.finance/recipes/sign-and-capture-charge
      break
    case EventType.CHARGE_CREATED:
      console.log(`Charge created`)
      // Handle the charge created event here
      // ...
      break
    case EventType.CHARGE_CONFIRMED:
      console.log(`Charge confirmed`)
      // Handle the charge confirmed event here
      // ...
      break
    case EventType.CHARGE_FINALIZED:
      console.log(`Charge finalized`)
      // Handle the charge finalized here
      // ...
      break
    case EventType.CHARGE_FAILED:
      console.log(`Charge failed`)
      // Handle the charge failed event here
      // ...
      break
    case EventType.CHARGE_ATTEMPT_FAILED:
      console.log(`Charge attempt failed`)
      // Handle the charge attempt failed event here
      // ...
      break

    case EventType.SUBSCRIPTION_CREATED:
      console.log(`Subscription was created`)
      // Handle the subscription created event here
      // ...
      break
    case EventType.SUBSCRIPTION_ACTIVE:
      console.log(`Subscription was activated`)
      // Handle the subscription active event here
      // ...
      break
    case EventType.SUBSCRIPTION_UPDATED:
      console.log(`Subscription was updated`)
      // Handle the subscription updated event here
      // ...
      break
    case EventType.SUBSCRIPTION_CANCELED:
      console.log(`Subscription was canceled`)
      // Handle the subscription canceling event here
      // ...
      break
    default:
      console.log(`Unhandled event type.`)
      break
  }

  // Return a 200 response to acknowledge receipt of the event
  res.sendStatus(200)
})

app.listen(3000, () => console.log('Running on port 3000'))

import * as dotenv from 'dotenv'
import {
  Webhooks,
  Event,
  EventType,
  Constants,
  Diagonal,
  DiagonalError,
} from '@diagonal-finance/sdk'
import express from 'express'

dotenv.config()

const app = express()

app.use(express.json()) // to support JSON-encoded bodies
app.use(express.urlencoded()) // to support URL-encoded bodies

const apiKey = process.env.DIAGONAL_API_KEY as string
const diagonalApiBaseUrl = process.env.DIAGONAL_API_BASE_URL as string
const endpointSecret = process.env.DIAGONAL_WEBHOOK_ENDPOINT_SECRET as string
const signingKey = process.env.DIAGONAL_SIGNING_PRIVATE_KEY as string

const diagonal = new Diagonal(apiKey, diagonalApiBaseUrl)

app.post('/webhook', async (req, res) => {
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

  // Handle the event
  switch (event.type) {
    case EventType.SIGNATURE_CHARGE_REQUEST: {
      const signatureRequest = event.data
      const charge = signatureRequest.data.charge

      const ecdsaSignature = diagonal.signatures.sign(
        signatureRequest,
        signingKey,
      )

      try {
        await diagonal.charges.capture(charge.id, ecdsaSignature)
      } catch (e) {
        if (e instanceof DiagonalError) {
          // Obtain error information
        }
      }

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
})

// start the express server
app.listen(3000, () => {
  console.log(`server started at http://localhost:3000`)
})

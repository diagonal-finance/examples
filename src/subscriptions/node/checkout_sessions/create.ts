import * as dotenv from 'dotenv'
import express, { Request, Response } from 'express'

import {
  RecurringInterval,
  CreateCheckoutSession,
  Diagonal,
} from '@diagonal-finance/sdk'

dotenv.config()

const app = express()

app.use(express.json()) // to support JSON-encoded bodies
app.use(express.urlencoded()) // to support URL-encoded bodies

const apiKey = process.env.DIAGONAL_API_KEY as string

const diagonal = new Diagonal(apiKey)

app.post('/create-checkout-session', async (_: Request, res: Response) => {
  // Example create checkout session input
  // Additionally you can link a customer to the checkout session, by providing the customer id
  // For creating a customer see: ../customers/create.ts
  const input: CreateCheckoutSession = {
    cancel_url: 'https://chainwire.net/cancel',
    success_url: 'https://chainwire.net/success',
    amount: '10',
    subscription: {
      interval: RecurringInterval.MONTH,
      interval_count: 1,
    },
  }

  const checkoutSession = await diagonal.checkout.sessions.create(input)

  res.send({
    url: checkoutSession.url,
  })
})

// start the express server
app.listen(3000, () => {
  console.log(`server started at http://localhost:3000`)
})

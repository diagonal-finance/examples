import * as dotenv from 'dotenv'
import express, { Request, Response } from 'express'
import fetch, { Response as ResponseFetch } from 'node-fetch'

dotenv.config()

const app = express()

app.use(express.json()) // to support JSON-encoded bodies
app.use(express.urlencoded()) // to support URL-encoded bodies

let apiKey = process.env.DIAGONAL_API_KEY as string
let diagonalApiBaseUrl = process.env.DIAGONAL_API_BASE_URL as string

app.post('/create-checkout-session', async (_: Request, res: Response) => {
  const createCheckoutSession = {
    cancel_url: 'https://chainwire.net/cancel',
    success_url: 'https://chainwire.net/success',
    optimistic_redirect: true,
    amount: '1',
    subscription: {
      interval: 'month',
      interval_count: 1,
    },
  }

  const response: ResponseFetch = await fetch(
    `${diagonalApiBaseUrl}/v1/checkout/sessions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify(createCheckoutSession),
    },
  )

  const responseBody = await response.json()
  const checkoutSessionUrl = responseBody.url

  res.send({
    url: checkoutSessionUrl,
  })
})

// start the express server
app.listen(3000, () => {
  console.log(`server started at http://localhost:3000`)
})

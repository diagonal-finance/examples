import express from 'express'
import environment from '../environment'
import { ICreateCheckoutSession } from '../types/checkout_session'
import { RecurringInterval } from '../types/subscription'
import fetch from 'cross-fetch'

export const checkoutSessionEndpoint = `/createCheckoutSession`

const app = express()

app.use(express.json()) // to support JSON-encoded bodies
app.use(express.urlencoded()) // to support URL-encoded bodies

app.get('/', (_req, res) => {
  res.json({ success: true })
})

app.post(checkoutSessionEndpoint, async (_, res) => {
    let apiKey = environment.DIAGONAL_API_KEY as string
    let diagonalApiBaseUrl = environment.DIAGONAL_API_BASE_URL as string

    const createChheckoutSession: ICreateCheckoutSession = {
        "cancel_url": "https://chainwire.net/cancel",
        "success_url": "https://chainwire.net/success",
        "optimistic_redirect": true,
        "amount": "1",
        "subscription": {
            "interval": RecurringInterval.MONTH,
            "interval_count": 1
        }
    }

    const response = await fetch(`${diagonalApiBaseUrl}/v1/checkout/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify(createChheckoutSession),
      })

      const responseBody = await response.json();

      const checkoutSessionUrl = responseBody.url;
      res.redirect(303, checkoutSessionUrl)
})

// start the express server
app.listen(8092, () => {
  console.log(
    `server started at http://localhost:8092`,
  )
})

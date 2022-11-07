import express from 'express'
import fetch from 'cross-fetch'

const app = express()

app.use(express.json()) // to support JSON-encoded bodies
app.use(express.urlencoded()) // to support URL-encoded bodies

app.post('/createCheckoutSession', async (_, res) => {
  let apiKey = process.env.DIAGONAL_API_KEY as string

  const createCheckoutSession = {
    cancel_url: 'https://chainwire.net/cancel',
    success_url: 'https://chainwire.net/success',
    amount: '10',
    subscription: {
      interval: 'month',
      interval_count: 1,
    },
  }

  const response = await fetch(
    `https://api.diagonal.finance/v1/checkout/sessions`,
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
  res.redirect(303, checkoutSessionUrl)
})

// start the express server
app.listen(8092, () => {
  console.log(`server started at http://localhost:8092`)
})

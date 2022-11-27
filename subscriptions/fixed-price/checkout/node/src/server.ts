/* eslint-disable @typescript-eslint/no-unused-vars */
import { Diagonal, Constants, DiagonalError, Event } from 'diagonal'
import express from 'express'

import * as dotenv from 'dotenv'
dotenv.config()

const isEnvConfigured =
  process.env.DIAGONAL_API_KEY &&
  process.env.DIAGONAL_SIGNING_PRIVATE_KEY &&
  process.env.DIAGONAL_WEBHOOK_ENDPOINT_SECRET
if (!isEnvConfigured)
  throw new Error(
    'The .env file is not configured. Follow the instructions in the root folder readme to configure the .env file.',
  )

const app = express()

app.use(express.json()) // to support JSON-encoded bodies
app.use(express.urlencoded({ extended: true })) // to support URL-encoded bodies

const apiKey = process.env.DIAGONAL_API_KEY as string
const signingKey = process.env.DIAGONAL_SIGNING_PRIVATE_KEY as string
const endpointSecret = process.env.DIAGONAL_WEBHOOK_ENDPOINT_SECRET as string

const diagonal = new Diagonal(apiKey)

// Create an account for your customer
app.post('/create-account/', async (req, res) => {
  const email = req.body.email
  // const name = req.body.name
  // ...

  // step 1: create diagonal customer
  const customer = await diagonal.customers.create({
    email,
  })

  // step 2: create a user in your database, store Diagonal customer id along side it
  // createUser(email, name, customer.id, ...)

  res.sendStatus(200)
})

// Checkout sessions
app.post('/create-checkout-session/', async (req, res) => {
  // While creating a checkout session, you can pass in a customer ID
  // to associate the session with a customer. This will allow you to
  // retrieve the customer's subscriptions later.
  let customerId = req.body.customerId

  const checkoutSession = await diagonal.checkout.sessions.create({
    cancel_url: 'https://example.com/cancel',
    success_url: 'https://example.com/success',
    amount: '10',
    payment_options: [
      {
        tokens: ['usdc', 'dai'],
      },
    ],
    subscription: {
      interval: 'month',
      interval_count: 1,
    },
    customer_id: customerId,
  })

  res.redirect(checkoutSession.url)
})

// Subscriptions
app.post('/upgrade-subscription/:id', async (req, res) => {
  const subscriptionId = req.params.id

  // You can upgrade a subscription by updating the subscription's amount
  // and interval. The subscription will be updated immediately.
  const updatedSubscription = await diagonal.subscriptions.update(
    subscriptionId,
    {
      billing_amount: '20',
      billing_interval: 'month',
      billing_interval_count: 1,
      charge_behaviour: 'immediate',
      prorate: true,
    },
  )

  res.sendStatus(200)
})

app.post('/cancel-subscription/:id', async (req, res) => {
  const subscriptionId = req.params.id

  // You can cancel a subscription immediately or at the end of the current billing period.
  // In this example, we follow the recommended approach and cancel the subscription at the end of the billing period,
  // while charging any outstanding amount immediately.

  const canceledSubscription = await diagonal.subscriptions.cancel(
    subscriptionId,
    {
      charge_behaviour: 'immediate',
      end_of_period: true,
    },
  )

  res.sendStatus(200)
})

// Webhook handling
app.post('/webhook', async (req, res) => {
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
    case 'signature.charge.request': {
      console.log(`Charge signature request`)

      // Handle the charge signature request event here
      const signatureRequest = event.data
      const charge = signatureRequest.data.charge

      const ecdsaSignature = diagonal.signatures.sign(
        signatureRequest,
        signingKey,
      )

      try {
        await diagonal.charges.capture(charge.id, ecdsaSignature)
        // charge has been captured successfully
      } catch (e) {
        if (e instanceof DiagonalError) {
          // Obtain error information
        }
      }

      break
    }
    case 'charge.created':
      console.log(`Charge created`)
      // Handle the charge created event here
      // ...
      break
    case 'charge.confirmed':
      console.log(`Charge confirmed`)
      // Handle the charge confirmed event here
      // ...
      break
    case 'charge.finalized':
      console.log(`Charge finalized`)
      // Handle the charge finalized here
      // ...
      break
    case 'charge.failed':
      console.log(`Charge failed`)
      // Handle the charge failed event here
      // ...
      break
    case 'charge.attempt_failed':
      console.log(`Charge attempt failed`)
      // Handle the charge attempt failed event here
      // ...
      break
    case 'subscription.created':
      console.log(`Subscription was created`)
      // Handle the subscription created event here
      // ...
      break
    case 'subscription.active':
      console.log(`Subscription was activated`)
      // Handle the subscription active event here
      // ...
      break
    case 'subscription.updated':
      console.log(`Subscription was updated`)
      // Handle the subscription updated event here
      // ...
      break
    case 'subscription.canceled':
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

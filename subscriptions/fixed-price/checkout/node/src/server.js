const dotenv = require('dotenv')
const express = require('express')
const {
  Constants,
  DiagonalError,
  EventType,
  Diagonal,
  RecurringInterval,
} = require('@diagonal-finance/sdk')

dotenv.config()

if (
  !process.env.DIAGONAL_API_KEY ||
  !process.env.DIAGONAL_SIGNING_PRIVATE_KEY ||
  !process.env.DIAGONAL_WEBHOOK_ENDPOINT_SECRET
) {
  console.log(
    'The .env file is not configured. Follow the instructions in the root folder readme to configure the .env file.',
  )
  console.log('')
  process.env.DIAGONAL_API_KEY
    ? ''
    : console.log('Add DIAGONAL_API_KEY to your .env file.')

  process.env.DIAGONAL_SIGNING_PRIVATE_KEY
    ? ''
    : console.log('Add DIAGONAL_SIGNING_PRIVATE_KEY to your .env file.')

  process.env.DIAGONAL_WEBHOOK_ENDPOINT_SECRET
    ? ''
    : console.log('Add DIAGONAL_WEBHOOK_ENDPOINT_SECRET to your .env file.')

  process.exit()
}

const app = express()

app.use(express.json()) // to support JSON-encoded bodies
app.use(express.urlencoded({ extended: true })) // to support URL-encoded bodies

const apiKey = process.env.DIAGONAL_API_KEY
const signingKey = process.env.DIAGONAL_SIGNING_PRIVATE_KEY
const endpointSecret = process.env.DIAGONAL_WEBHOOK_ENDPOINT_SECRET

const diagonal = new Diagonal(apiKey)

// Checkout sessions

app.post('/create-checkout-session', async (req, res) => {
  const input = {
    cancel_url: 'https://chainwire.net/cancel',
    success_url: 'https://chainwire.net/success',
    amount: '10',
    subscription: {
      interval: RecurringInterval.MONTH,
      interval_count: 1,
    },
    customer_id: req.body.customer_id, // the customer field is optional, but you can use it to link a customer to the checkout session
  }

  const checkoutSession = await diagonal.checkout.sessions.create(input)

  res.send({
    url: checkoutSession.url,
  })
})

app.post('/expire-checkout-session/:id', async (req, res) => {
  const checkoutSessionId = req.params.id
  const expiredCheckoutSession = await diagonal.checkout.sessions.expire(
    checkoutSessionId,
  )
  res.send(expiredCheckoutSession)
})

app.post('/get-checkout-session/:id', async (req, res) => {
  const checkoutSessionId = req.params.id
  const checkoutSession = await diagonal.checkout.sessions.get(
    checkoutSessionId,
  )
  res.send(checkoutSession)
})

// Subscriptions

app.get('/get-subscription/:id', async (req, res) => {
  const subscriptionId = req.params.id
  const subscription = await diagonal.subscriptions.get(subscriptionId)
  res.send(subscription)
})

app.put('/update-subscription/:id', async (req, res) => {
  const subscriptionId = req.params.id

  const input = {
    billing_amount: req.body.billing_amount,
    billing_interval: req.body.billing_interval,
    billing_interval_count: req.body.billing_interval_count,
    charge_behaviour: req.body.charge_behaviour,
    prorate: req.body.prorate,
    metadata: req.body.metadata,
    reference: req.body.reference,
  }

  const updatedSubscription = await diagonal.subscriptions.update(
    subscriptionId,
    input,
  )
  res.send(updatedSubscription)
})

app.post('/cancel-subscription/:id', async (req, res) => {
  const subscriptionId = req.params.id

  const input = {
    charge_behaviour: req.body.charge_behaviour,
    end_of_period: req.body.end_of_period,
  }

  const canceledSubscription = await diagonal.subscriptions.cancel(
    subscriptionId,
    input,
  )

  res.send(canceledSubscription)
})

// Charges

app.post('/get-charge/:id', async (req, res) => {
  const chargeId = req.params.id
  const charge = await diagonal.charges.get(chargeId)
  res.send(charge)
})

app.put('/update-charge/:id', async (req, res) => {
  const chargeId = req.params.id

  const input = {
    name: req.body.name,
    description: req.body.description,
    reference: req.body.reference,
    metadata: req.body.metadata,
  }

  const charge = await diagonal.charges.update(chargeId, input)
  res.send(charge)
})

// Customers

app.post('/create-customer', async (req, res) => {
  const input = {
    email: req.body.email,
    name: req.body.name,
  }

  const customer = await diagonal.customers.create(input)
  res.send(customer)
})

app.post('/update-customer/:id', async (req, res) => {
  const customerId = req.params.id

  const input = {
    email: req.body.email,
    name: req.body.name,
  }

  const updatedCustomer = await diagonal.customers.update(customerId, input)
  res.send(updatedCustomer)
})

app.get('/get-customer/:id', async (req, res) => {
  const customerId = req.params.id
  const customer = await diagonal.customers.get(customerId)
  res.send(customer)
})

app.delete('/delete-customer/:id', async (req, res) => {
  const customerId = req.params.id
  await diagonal.customers.delete(customerId)
  res.send(200)
})

// Webhook handling

app.post('/webhook', async (req, res) => {
  const payload = req.body
  const signatureHeader = req.headers[Constants.SIGNATURE_HEADER_KEY]

  let event

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

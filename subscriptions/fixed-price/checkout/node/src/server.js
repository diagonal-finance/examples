/* eslint-disable @typescript-eslint/no-unused-vars */
// @ts-nocheck
const express = require('express')
const { Constants, DiagonalError, Diagonal } = require('diagonal')
require('dotenv').config()

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

// Use test api key for development and live api key for production
const apiKey = process.env.DIAGONAL_API_KEY
const signingKey = process.env.DIAGONAL_SIGNING_PRIVATE_KEY
// Use test webhook secret for development and live webhook secret for production
const endpointSecret = process.env.DIAGONAL_WEBHOOK_ENDPOINT_SECRET

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
  const customerId = req.params.customerId

  const input = {
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
  }

  const checkoutSession = await diagonal.checkout.sessions.create(input)

  res.redirect(checkoutSession.url)
})

// Subscriptions
app.post('/upgrade-subscription/:id', async (req, res) => {
  const subscriptionId = req.params.id

  // You can upgrade a subscription by updating the subscription's amount
  // and interval. The subscription will be updated immediately.
  const input = {
    billing_amount: '20',
    billing_interval: 'month',
    billing_interval_count: 1,
    charge_behaviour: 'immediate',
    prorate: true,
  }

  const updatedSubscription = await diagonal.subscriptions.update(
    subscriptionId,
    input,
  )

  res.sendStatus(200)
})

app.post('/cancel-subscription/:id', async (req, res) => {
  const subscriptionId = req.params.id

  // You can cancel a subscription immediately or at the end of the current billing period.
  // In this example, we follow the recommended approach and cancel the subscription at the end of the billing period,
  // while charging any outstanding amount immediately.
  const input = {
    charge_behaviour: 'immediate',
    end_of_period: true,
  }

  const canceledSubscription = await diagonal.subscriptions.cancel(
    subscriptionId,
    input,
  )

  res.sendStatus(200)
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
    case 'signature.charge.request': {
      await handleSignatureChargeRequest(diagonal, event.data)
      break
    }
    case 'charge.confirmed':
      handleChargeConfirmed(event.data)
      break
    case 'charge.finalized':
      handleChargeFinalized(event.data)
      break
    case 'charge.failed':
      handleChargeFailed(event.data)
      break
    case 'charge.attempt_failed':
      handleChargeAttemptFailed(event.data)
      break
    case 'subscription.created':
      handleSubscriptionCreated(event.data)
      break
    case 'subscription.active':
      handleSubscriptionActive(event.data)
      break
    case 'subscription.updated':
      handleSubscriptionUpdated(event.data)
      break
    case 'subscription.canceled':
      handleSubscriptionCanceled(event.data)
      break
    default:
      console.log(`Unhandled event type.`)
      break
  }

  // Return a 200 response to acknowledge receipt of the event
  res.sendStatus(200)
})

app.listen(3000, () => console.log('Running on port 3000'))

/**
 * Handlers
 */

async function handleSignatureChargeRequest(diagonal, signatureRequest) {
  const charge = signatureRequest.data.charge

  /*
  switch (chargeObject.reason) {
    case 'subscription_creation':
      // Handle the subscription creation charge here
      break
    case 'subscription_due':
      // Handle the subscription due charge here
      break
    case 'subscription_update':
      // Handle the subscription update charge here
      break
    case 'subscription_cancel':
      // Handle the subscription cancel charge here
      break
    default:
      throw new Error('Unhandled charge reason')
  }
  */

  const ecdsaSignature = diagonal.signatures.sign(signatureRequest, signingKey)

  try {
    await diagonal.charges.capture(charge.id, ecdsaSignature)
    // charge has been captured successfully
  } catch (e) {
    if (e instanceof DiagonalError) {
      // Obtain error information
    }
  }
}

async function handleChargeConfirmed(charge) {
  /*
  const subscription = SubscriptionTable.findOne({
    diagonalSubscriptionId: charge.subscription_id,
  })
  if (!subscription) throw new Error('Subscription not found')
  */
  if (charge.reason !== 'subscription_update') return

  // Upgrade/downgrade payment has succeeded, optionally update your database
  // You can now give access to the updated plan to the user
}

async function handleChargeFinalized(charge) {
  /*
  const subscriptionInDatabase = SubscriptionTable.findOne({
    diagonalSubscriptionId: charge.subscription_id,
  })
  if (!subscriptionInDatabase) throw new Error('Subscription not found')
  */
  switch (charge.reason) {
    case 'subscription_due' /*
      // Recurring payment has succeeded, optionally update your database
      
      // If the subscription comes from the past_due status caused by a failed due payment,
      // you may want to update the status to active
      if (subscriptionInDatabase.status === SubscriptionStatus.PastDue) {
        SubscriptionTable.update(subscriptionInDatabase.id, {
          status: SubscriptionStatus.Active,
        })
      }  */:
      break
    case 'subscription_update' /*
        // Payment for the subscription update has succeeded, optionally update your database
        
        // If the subscription comes from the past_due status caused by a failed payment,
        // during an update, you may want to update the status to active
        if (subscriptionInDatabase.status !== SubscriptionStatus.Active) {
          SubscriptionTable.update(subscriptionInDatabase.id, {
            status: SubscriptionStatus.Active,
          })
        }
        
        */:
      break
    case 'subscription_cancel':
      // Payment for subscription cancel has succeeded, optionally update your database
      break
    default:
      break
  }
}

async function handleChargeFailed(charge) {
  /*
  const subscription = SubscriptionTable.findOne({
    diagonalSubscriptionId: charge.subscription_id,
  })
  if (!subscription) throw new Error('Subscription not found')
  */

  // Notify the user that the subscription charge failed
  // for the reason specified in charge.last_attempt_failure_reason
  // E.g. insufficient_balance or insufficient_allowance

  if (charge.reason === 'subscription_creation') {
    // If the subscription creation failed, you can delete the subscription
    // from your database and redirect the user to a new checkout session
    return
  }

  // For all the other reasons, you should handle the settlement of the payment
  // through another channel, as Diagonal will no longer retry the payment
  // as all the attempts have been exhausted.
}

async function handleChargeAttemptFailed(charge) {
  /* const subscription = SubscriptionTable.findOne({
    diagonalSubscriptionId: charge.subscription_id,
  })
  if (!subscription) throw new Error('Subscription not found') */

  switch (charge.reason) {
    case 'subscription_due' /*
      // Notify the user that the subscription charge failed
      // for the reason specified in charge.last_attempt_failure_reason
      // E.g. insufficient_balance or insufficient_allowance
      // and the next attempt will be made at `charge.next_attempt_at`

      if (subscription.status === SubscriptionStatus.Active) {
        // You can either use this to update the subscription status
        // or use the handleSubscriptionUpdated and check the received subscription
        // status to be past_due and transition it to past_due
        SubscriptionTable.update(subscription.id, {
          status: SubscriptionStatus.PastDue,
        })
      } */:
      break
    case 'subscription_update' /*
      // Notify the user that the subscription update failed
      // for the reason specified in charge.last_attempt_failure_reason
      // E.g. insufficient_balance or insufficient_allowance
      // and the next attempt will be made at `charge.next_attempt_at`
      
      if (subscription.status !== SubscriptionStatus.PastDue) {
        // You can either use this to update the subscription status
        // or use the handleSubscriptionUpdated and check the received subscription
        // status to be past_due and transition it
        SubscriptionTable.update(subscription.id, {
          status: SubscriptionStatus.PastDue,
        })
      }*/:
      break
    case 'subscription_cancel':
      // Notify the user that the subscription cancel payment failed
      // for the reason specified in charge.last_attempt_failure_reason
      // e.g. insufficient_balance or insufficient_allowance
      // and the next attempt will be made at `charge.next_attempt_at`
      break
    default:
      break
  }
}

function handleSubscriptionCreated(subscription) {
  /*
  const user = UserTable.findOne({
    diagonalCustomerId: subscription.customer_id!,
  })

  // Acknowledge the subscription in order to give feedback to the user
  // and link it with Diagonal subscription id. Note that the reference used
  // here is the one you provided when creating the checkout session.
  SubscriptionTable.create({
    userId: user.id,
    status: SubscriptionStatus.Created,
    diagonalSubscriptionId: subscription.id,
    planId: subscription.reference,
  })
  */
}

async function handleSubscriptionActive(subscription) {
  /*
  const yourSubscription = SubscriptionTable.findOne({
    diagonalSubscriptionId: subscription.id,
  })
  if (!yourSubscription) throw new Error('Subscription not found')
  
  // You will receive active when the subscription goes from past_due to active
  // but you can handle it in the handleChargeFinalized
  if (yourSubscription.status !== SubscriptionStatus.Created) return

  SubscriptionTable.update(yourSubscription.id, {
    status: SubscriptionStatus.Active,
  })
  */
}

async function handleSubscriptionUpdated(subscription) {
  /*
  const subscriptionToUpdate = SubscriptionTable.findOne({
    diagonalSubscriptionId: subscription.id,
  })
  if (!subscriptionToUpdate) throw new Error('Subscription not found')
  */

  switch (subscription.status) {
    case 'active' /*
      // You can receive an update when the subscription is updated or 
      // when a successful due payment is made.

      // If you store the plan or product in the subscription reference,
      // you can check if this is an update, and act accordingly
      if (subscriptionToUpdate.planId !== subscription.reference) {
        // Handle the subscription upgrade/downgrade here
        SubscriptionTable.update(subscription.id, {
          planId: subscription.reference!,
        })
      } */:
      break
    case 'canceling':
      // Handle the subscription canceling here
      break
    case 'trialing':
      // If a subscription gets updated during the trial period, you will
      // receive an update with subscription status being trialing
      break
    default:
      break
  }
}

async function handleSubscriptionCanceled(subscription) {
  /*
  const subscriptionToUpdate = SubscriptionTable.findOne({
    diagonalSubscriptionId: subscription.id,
  })
  if (!subscriptionToUpdate) throw new Error('Subscription not found')

  // Update the subscription to canceled
  SubscriptionTable.update(subscriptionToUpdate.id, {
    status: SubscriptionStatus.Canceled,
  })

  // Notify the user that the subscription has been canceled
  */
}

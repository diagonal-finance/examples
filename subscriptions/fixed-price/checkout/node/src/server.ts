/* eslint-disable @typescript-eslint/no-unused-vars */
import { Diagonal, Token, Chain, Constants, DiagonalError } from 'diagonal'
import type {
  Event,
  Subscription as DiagonalSubscription,
  Signature,
  Charge,
} from 'diagonal'
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

// Use test api key for development and live api key for production
const apiKey = process.env.DIAGONAL_API_KEY as string
const signingKey = process.env.DIAGONAL_SIGNING_PRIVATE_KEY as string
// Use test webhook secret for development and live webhook secret for production
const endpointSecret = process.env.DIAGONAL_WEBHOOK_ENDPOINT_SECRET as string

const diagonal = new Diagonal(apiKey)

/**
 * Plans
 * Since you will be integrating fixed price subscriptions
 * you will need some notion of plans/products, either defined locally, in your database,
 * or using an external provider. In this example we choose to define plans locally.
 */
const basicPlan = {
  id: '1',
  amount: '10',
  tokens: [Token.DAI, Token.USDC],
  chains: [Chain.ETHEREUM, Chain.POLYGON],
  interval: 'month' as const,
  intervalCount: 1,
}

const premiumPlan = {
  id: '2',
  amount: '50',
  tokens: [Token.DAI, Token.USDC],
  chains: [Chain.ETHEREUM, Chain.POLYGON],
  interval: 'month' as const,
  intervalCount: 1,
}

/**
 * Checkout session
 *
 *  IMPORTANT fields
 *  - `customer_id`: WHO is subscribing
 *                   We recommend you pass a Diagonal customer id when creating a checkout creation.
 *                   `customer_id` will help you link a paying subscriber to a completed checkout session.
 *
 *  - `reference`  : WHAT they are subscribing to
 *                   We recommend you pass a `reference` for what the user is paying for on checkout creation.
 *                   Ideally this reference would refer to a unique product/plan/invoice id.
 *
 *
 *  NOTE: `customer_id` and `reference` will be available in the `subscription.created` webhook event.
 *         This will help you verify WHO subscribed and WHAT they paid for.
 */
app.post('/create-checkout-session/', async (req, res) => {
  /* 
     ***************************** Database code - rewrite yourself ********************************      
      
     Create a Diagonal `Customer` if not found in DB

      ```
        // Step 1: Get user from your DB
        const user = UserTable.findOne({
          req.user.id
        })

        let diagonalCustomerId = user.diagonalCustomerId;

        // Step 2: If user does not have a Diagonal customer id, create a new id and update user DB
        if (diagonalCustomerId === undefined) {
          
          // Uniquely identify your customers
          const diagonalCustomer = await diagonal.customers.create({
            email: user.email,
            name: user.name, // optional
            reference: user.id // optionally link diagonal customer to local user id
          })

          const user = UserTable.update(user.id, {
            diagonalCustomerId: diagonalCustomer.id,
          })

          diagonalCustomerId = diagonalCustomer.id
        }
      ```
  */

  let customerId // diagonalCustomer

  // If you are selling multiple products/services, pass the product id from your frontend
  const plan = req.body.plan === 'basic' ? basicPlan : premiumPlan

  const checkoutSession = await diagonal.checkout.sessions.create({
    cancel_url: 'https://example.com/cancel',
    success_url: 'https://example.com/success',
    amount: plan.amount,
    payment_options: [
      {
        tokens: plan.tokens,
      },
    ],
    subscription: {
      interval: plan.interval,
      interval_count: plan.intervalCount,
    },
    customer_id: customerId, // Who is subscribing
    reference: plan.id, // What they are subscribing to
  })

  res.redirect(checkoutSession.url)
})

app.post('/upgrade-subscription/:id', async (req, res) => {
  /*
    You can upgrade a subscription by updating the subscription's amount and/or interval.
    The subscription will be updated immediately, if a a prorated charge is required, it will be created and processed automatically.
    Refer to: https://docs.diagonal.finance/docs/upgrade-or-downgrade-subscriptions
  */

  const subscriptionId = req.params.id
  const plan = req.body.plan === 'basic' ? basicPlan : premiumPlan

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

  /*
    If using plans you may want to update the planId on the DB subscription entity
    ```
      SubscriptionTable.update(subscriptionId, { planId: premiumPlan.id })
    ```
  */

  res.sendStatus(200)
})

app.post('/cancel-subscription/:id', async (req, res) => {
  /*
    You can cancel a subscription immediately or at the end of the current billing period.
    Any outstanding amount will be charged immediately.
    Refer to: https://docs.diagonal.finance/docs/cancel-subscriptions
  */

  const subscriptionId = req.params.id
  const canceledSubscription = await diagonal.subscriptions.cancel(
    subscriptionId,
    {
      charge_behaviour: 'immediate',
      end_of_period: true,
    },
  )

  /*
    If using plans you may want to update the planId on the DB subscription entity.
    If `end_of_period` == true, update DB subscription status to `canceling`.
    If `end_of_period` == false, update DB subscription status to `canceled`.
    ```
      SubscriptionTable.update(subscriptionId, { status: '...' })
    ```
  */

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

  /*
    Handle webhook events

    Refer to https://docs.diagonal.finance/docs/subscriptions-events,
    to learn more about the subscription lifecycle
    
  */
  switch (event.type) {
    case 'signature.charge.request': {
      await handleSignatureChargeRequest(diagonal, event.data)
      break
    }
    case 'charge.confirmed':
      handleChargeConfirmed(event.data)
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
    case 'subscription.canceled':
      handleSubscriptionCanceled(event.data)
      break
    default:
      break
  }

  // Return a 200 response to acknowledge receipt of the event
  res.sendStatus(200)
})

app.listen(3000, () => console.log('Running on port 3000'))

/***************************************** Handlers ***************************************************/

/**
 * Handler should be called when you are asked to sign a charge request.
 * @param diagonal Diagonal SDK instance
 * @param signatureRequest The signature request event data
 */
async function handleSignatureChargeRequest(
  diagonal: Diagonal,
  signatureRequest: Signature,
): Promise<void> {
  // 1: Extract charge payload and optionally verify charge request
  const charge = signatureRequest.data.charge

  //2: Use your signing key and attest to the charge request
  const ecdsaSignature = diagonal.signatures.sign(signatureRequest, signingKey)

  // 3: Capture the charge request
  await diagonal.charges.capture(charge.id, ecdsaSignature)
}

/**
 * Charge confirmed
 *
 *  We recommend listening to `charge.confirmed` when handling the following subscription lifecycle events:
 *
 *   - S1: Subscription creation charge successful e.g. Month 1 Alice subscribes 10 USDC
 *   - S2: Subscription due charge successful e.g Month 2 charge Alice 10 USDC
 *   - S3: Free trial converting
 *   - S4: Subscription update charge successful e.g. Update Alice subscription to 20 USDC
 *   - S5: Subscription cancel charge successful e.g. Cancel Alice subscription with due amount
 *   - S6: Subscription past due charge successful e.g. Previous failed charge to Alice has now succeeded
 *
 * @param charge The charge object received in the event
 */
async function handleChargeConfirmed(charge: Charge): Promise<void> {
  /*
    ////////////////////////////////// Database code - rewrite yourself /////////////////////////////////////////
      
    ```
      // Read the subscription from your database
      const subscriptionInDatabase = SubscriptionTable.findOne({
        diagonalSubscriptionId: charge.subscription_id,
      })

      if (!subscriptionInDatabase) return;

      // Handle free trials converting (S3 ✅)
      if (subscriptionInDatabase.status === 'trailing') {
        
        // Step 1: Update subscription to active 
        SubscriptionTable.update(subscriptionInDatabase.id, { status: 'active' })

        // Step 2: Optionally send invoice and store charges locally
        // ...

        return
      }
        
    ```
  */

  // Handle past due charge successful (S6 ✅)
  if (charge.attempt_count > 1) {
    /*    
      ```
        // Step 1: Update subscription to active 
        SubscriptionTable.update(subscriptionInDatabase.id, { status: 'active' })

        // Step 2: Optionally send invoice and store charges locally
        // ...

        return
      ```
    */
  }
  switch (charge.reason) {
    case 'subscription_creation': // S1 ✅
    case 'subscription_due': // S2 ✅
    case 'subscription_update': // S4 ✅
    case 'subscription_cancel': // S5 ✅
      /*
        You may want to do the following:
        - Send an invoice to your customer.
        - Store charges in your DB.
      */
      break

    default:
      break
  }
}

/**
 * Subscription created
 *
 * We recommend listening to `subscription.created`, to handle the case when a checkout is a completed.
 * Use this event to provide feedback though the UI, and create a new subscription in your database.
 *
 * @param subscription The subscription object received in the event
 */
async function handleSubscriptionCreated(
  subscription: DiagonalSubscription,
): Promise<void> {
  /*
      Find the user in your database using the `customer_id` or `reference`, specified on the subscription object:

      ```
        const user = UserTable.findOne({
          diagonalCustomerId: subscription.customer_id!,
        })
      ```

      Create a new subscription in your database:
    
      ```
        SubscriptionTable.create({
          userId: user.id,
          status: 'active',
          diagonalSubscriptionId: subscription.id,
          planId: subscription.reference,
        })
      ```

  */
  console.log(subscription)
}

/**
 * Charge attempt failed
 *
 * @param charge The charge object received in the event
 */
async function handleChargeAttemptFailed(charge: Charge): Promise<void> {
  /*
    You may want to notify your user that the subscription charge failed, 
    based on the failure reason specified in `charge.last_attempt_failure_reason`

    NOTE: charge will be re-attempted at `charge.next_attempt_at`
  */

  switch (charge.last_attempt_failure_reason) {
    case 'insufficient_spending_allowance':
      // Notify the user to increase their spending allowance on subscriptions.diagonal.finance
      break
    case 'insufficient_balance':
      // Notify the user to fund their wallet
      break
    default:
      break
  }
}

/**
 * Charge failed
 *
 *  We recommend listening to `charge.failed` when handling the following subscription lifecycle events:
 *
 *   - S1: Subscription creation failed
 *
 *  DISCLAIMER:
 *  `charge.failed` can fire in other scenarios e.g. "maximum number of retry attempts reached" or "address blacklist usdc".
 *  We recommend handling these scenarios in `handleSubscriptionCanceled`.
 *
 * @param charge The charge object received in the event
 */
async function handleChargeFailed(charge: Charge): Promise<void> {
  if (charge.reason === 'subscription_creation') {
    /*
      Handle subscription creation failed (S1 ✅)

      1: Remove diagonal subscription entry from your database
      ```
        SubscriptionTable.deleteOne({ diagonalSubscriptionId: charge.subscription_id })
      ```

      2: Ask user to resubscribe by creating a new checkout session - optionally notifying them why charge failed.  
         Use `charge.last_attempt_failure_reason` to specify reason for charge failure.
         e.g. "insufficient_balance" or "insufficient_allowance".
    */
  }
}

/**
 * Subscription canceled
 *
 * This handler should be called when a subscription.canceled event is received.
 *
 * When you receive this event, the subscription has already been canceled.
 * This can either happen when you cancel the subscription through the UI or API,
 * or when the subscription is canceled automatically due to a failed payment.
 *
 * @param subscription The subscription object received in the event
 */
async function handleSubscriptionCanceled(
  subscription: DiagonalSubscription,
): Promise<void> {
  /*
    You may want to do the following:

    1: Update status in the subscription table to canceled:
      ```
        SubscriptionTable.update(subscriptionToUpdate.id, { status: 'canceled' })
      ```
    
    2: Notify user that the their subscription has been canceled, for a reason specified in `subscription.cancel_reason`. 
      e.g. "max_charge_attempts_reached" or "address_blacklisted_by_usdc"

    3: Initiate any flow required to handle uncollected revenue, as charge will not be re-attempted.

  */
  console.log(subscription)
}

/********************************** Database overview ********************************************** */

/* 
  **OVERVIEW**
  Throughout the example integrations we inline short "database snippets", which are meant to provide a high level guide 
  for how to use Diagonal alongside your existing database. These snippets should be rewritten by yourself.

  You are free to use any relational or non-relational database you like, but the current examples reference
  `Subscription` and `User` relational database tables. 
  
  We recommend keeping track of the following attributes in your database of choice:
  
  **Subscription Table**
    ...

    status: 'active' | 'canceling' | 'canceled' | 'trailing' | 'created' | 'past_due'
    diagonalSubscriptionId: string // Reference the Diagonal subscription id
    planId: string // ID of the plan or product the user has subscribed to
    userId: string // Relation to your user table
    
    ...
  
  **User Table**
    ...

    diagonalCustomerId: string // Reference the Diagonal customer id

    ...

  IMPORTANT:
  * Keep track of the subscription status locally to avoid making requests to Diagonal API and risk hitting the rate limits.
  * Keep track of Diagonal customer ids so you associate webhook events with customers.

*/

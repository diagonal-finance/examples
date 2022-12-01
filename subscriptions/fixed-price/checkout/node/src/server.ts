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
 * or using an external provider.
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
 *  - `customer_id`: WHO is paying
 *                   We recommend you pass a Diagonal customer id on checkout creation.
 *                   `customer_id` will help you link a paying subscriber to a completed checkout session.
 *
 *  - `reference`  : WHAT they are paying for
 *                   We recommend you pass a `reference` for what the user is paying for on checkout creation.
 *                   Ideally this reference would refer to a unique product/plan/invoice id.
 *
 *
 *  NOTE: `customer_id` and `reference` will be available in the `subscription.created` webhook event.
 *         This will help you verify WHO paid and WHAT they paid for.
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
            name: user.name,
            reference: user.id // optionally pass some unique ref if (email, name) is not unique
          })

          const user = UserTable.update(user.id, {
            diagonalCustomerId: diagonalCustomer.id,
          })

          diagonalCustomerId = diagonalCustomer.id
        }
      ```
  */

  let customerId // diagonalCustomer.id

  // If you are selling multiple products/service, pass the product id from your frontend
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
    customer_id: customerId, // Who is paying
    reference: plan.id, // What they are paying for
  })

  res.redirect(checkoutSession.url)
})

app.post('/upgrade-subscription/:id', async (req, res) => {
  /*
    You can upgrade a subscription by updating the subscription's amount and/or interval.
    The subscription will be updated immediately, if a charge is required it will be automatically created.
    Refer to: https://docs.diagonal.finance/docs/upgrade-or-downgrade-subscriptions
  */

  const subscriptionId = req.params.id
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

  // NOTE: Update your database subscription entity to the new billing details

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

  // NOTE: Update your database subscription entity to canceling status
  // (as `end_of_period` is set to true)

  res.sendStatus(200)
})

/**
 *  Webhook handling
 */
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
      console.warn(`Unhandled event type.`)
      break
  }

  // Return a 200 response to acknowledge receipt of the event
  res.sendStatus(200)
})

app.listen(3000, () => console.log('Running on port 3000'))

/********************************************************* Handlers ***************************************************************/

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
 *  We recommend pivoting on `charge.confirmed` when handling the following subscription lifecycle events:
 *
 *   - Subscription creation charge successful e.g. Month 1 Alice subscribes 10 USDC
 *   - Subscription due charge successful e.g Month 2 charge Alice 10 USDC
 *   - Subscription update charge successful e.g. Update Alice subscription to 20 USDC, and pro rates are active
 *   - Subscription cancel charge successful e.g. Cancel Alice subscription, but she has balance due.
 *   - Subscription past due charge successful e.g. Initially Failed to charge Alice, but now succeeded
 *
 * @param charge The charge object received in the event
 */
async function handleChargeConfirmed(charge: Charge): Promise<void> {
  /*
     ***************************** Database code - rewrite yourself ******************************** 

      Getting the subscription from your database to be used throughout pivoting

      ```
        const subscriptionInDatabase = SubscriptionTable.findOne({
          diagonalSubscriptionId: charge.subscription_id,
        })
        if (!subscriptionInDatabase) return;
      ```
  */

  /*
     ***************************** Database code - rewrite yourself ******************************** 
      
     Case 1: Free trial manual update and we charge immediatley

     Case 2: Free trial converts

      ```
        const subscriptionInDatabase = SubscriptionTable.findOne({
          diagonalSubscriptionId: charge.subscription_id,
        })



        if (subscriptionInDatabase.status === SubscriptionStatus.trailing) {
            return handleChargeConfirmedAfterTrailing(charge)
        }
      ```
  */

  if (charge.attempt_count > 1) {
    return handleChargeConfirmedAfterFailedAttempt(charge)
  }

  switch (charge.reason) {
    case 'subscription_creation':
      /*
          Payment for subscription creation has succeeded.
      */
      break
    case 'subscription_due':
      /*
        Case 1: Charge succeeded for month 2

        - Send receipt to user
        - Optionally store charges

      */
      break
    case 'subscription_update':
      /*
          Payment for the subscription update has succeeded. 

        Case 1: Update amount to 20 and execute successful 


      */
      break
    case 'subscription_cancel':
      /*
          Payment for subscription cancel has succeeded.
      */
      break
    default:
      break
  }
}

async function handleChargeConfirmedAfterFailedAttempt(
  charge: Charge,
): Promise<void> {
  /*


      Case 1: Past due flow I, Charge succeeds coming from past due 


      Case 2: Past due flow II, tried to update, not enough balance/allowance, moves to past due, and tries in 24 hours

      Store status of a subscription locally so don't have to ping Diagonal everytime.
      When coming from past due you need tp update.

      Note: You may receive this event when a subscription is in past_due state,
      indicating the past due payment has now been confirmed. 
      
      You can now update the subscription status to active, by checking the
      status is past due, e.g.:

      ```
        if (subscriptionInDatabase.status === SubscriptionStatus.PastDue) {
          SubscriptionTable.update(subscriptionInDatabase.id, {
            status: SubscriptionStatus.Active,
          })
        }
      ```

      */
}

/**
 *
 * ENTRY POINTS: Subscription creation failed
 * ENTRY POINTS: Past due final failed
 * No massive biz logic changes
 *
 * This handler should be called when a charge.failed event is received.
 *
 * If you receive this event, means that the charge is no longer going to be retried.
 * You may want to schedule any flow that is required to handle uncollected revenue.
 *
 * Note: A subscription will be automatically canceled when a charge transitions to the failed status.
 * So you don't need to manually trigger a subscription cancel.
 *
 * @param charge The charge object received in the event
 */
async function handleChargeFailed(charge: Charge): Promise<void> {
  /*

      Getting the subscription from your database, e.g.:
      
      ```
        const subscriptionInDatabase = SubscriptionTable.findOne({
          diagonalSubscriptionId: charge.subscription_id,
        })
        if (!subscriptionInDatabase) return;
      ```

  */

  if (charge.reason === 'subscription_creation') {
    /*

          Notify the user that the subscription charge failed
        for the reason specified in charge.last_attempt_failure_reason
        E.g. insufficient_balance or insufficient_allowance.

        If the subscription creation failed, you can remove the diagonal subscription 
        relation from the subscription in your database and redirect the user to a new checkout session.

        For these cases, Diagonal subscriptions transitions to `expired`.

    */
    return
  }

  /*

      Notify the user that the subscription charge failed
      for the reason specified in charge.last_attempt_failure_reason
      E.g. insufficient_balance or insufficient_allowance.

      Because this charge will not be retried again, you might want to schedule
      any flow that is required to handle uncollected revenue.

  */
}

/**
 *
 * NOTIFY USER
 *
 * Case 1: Subscription dashboard
 * Case 2: Get more ERC20
 *
 * This handler should be called when a charge.attempt_failed event is received.
 *
 * You may want to use this event to contact the user in order to either increase their
 * allowance or balance.
 *
 * @param charge The charge object received in the event
 */
async function handleChargeAttemptFailed(charge: Charge): Promise<void> {
  /*

      Getting the subscription from your database, e.g.:
      
      ```
        const subscriptionInDatabase = SubscriptionTable.findOne({
          diagonalSubscriptionId: charge.subscription_id,
        })
        if (!subscriptionInDatabase) return;
      ```

  */

  /*

      Notify the user that the subscription charge failed, 
      through your preferred channel, e.g. email or push,
      based on the failure reason specified in `charge.last_attempt_failure_reason`

      Will re-try charge at charge.next_attempt_at
  */
  switch (charge.last_attempt_failure_reason) {
    case 'insufficient_allowance':
      /*
          The attempt to charge for a subscription due has failed.
      */
      break
    case 'insufficient_balance':
      /*
          The attempt to charge for an update has failed.
      */
      break
    default:
      break
  }
}

/**
 *
 * ENTRY POINT: Checkout session completion
 *              Use for super responisve subscription.
 *
 * This handler should be called when a subscription.created event is received.
 *
 * You can use this event to create a new subscription in your database and
 * link it to the user.
 *
 * Moreover, use this event if you want to provide feedback though the UI,
 * as it's created just after checkout session is completed.
 *
 * @param subscription The subscription object received in the event
 */
async function handleSubscriptionCreated(
  subscription: DiagonalSubscription,
): Promise<void> {
  /*

      Find the user in your database using the relation to the Diagonal
      customer id, e.g.:
      ```
        const user = UserTable.findOne({
          diagonalCustomerId: subscription.customer_id!,
        })
      ```

      Create a new subscription in your database, e.g.:
    
      ```
        SubscriptionTable.create({
          userId: user.id,
          status: SubscriptionStatus.Created,
          diagonalSubscriptionId: subscription.id,
          planId: subscription.reference,
        })
      ```

      Note: The reference in the received subscription is the same as the one you provided
      in the checkout session used by the user. You can use this to link the
      subscription to any other entity in your database, e.g. a plan, a product, etc.

  */
}

/**
 * This handler should be called when a subscription.canceled event is received.
 *
 * When you receive this event, the subscription has already been canceled.
 * This can either happen when you cancel the subscription through the
 * https://docs.diagonal.finance/reference/subscriptions-cancel endpoint, or
 * when the subscription is canceled automatically due to a failed payment.
 *
 * @param subscription The subscription object received in the event
 */
async function handleSubscriptionCanceled(
  subscription: DiagonalSubscription,
): Promise<void> {
  /*

      Find the subscription in your database using the relation to the Diagonal, e.g.:

      ```
        const subscriptionInDatabase = SubscriptionTable.findOne({
          diagonalSubscriptionId: subscription.id,
        })
        if (!subscriptionInDatabase) return;
      ```

      Update the subscription status in your database, and trigger any
      action, such as notifications, you may want to perform, e.g.:

      ```
        SubscriptionTable.update(subscriptionToUpdate.id, {
          status: SubscriptionStatus.Canceled,
        })

        // Call your notification service
      ```

  */
}

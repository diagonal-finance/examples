/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  CancelChargeBehaviour,
  Constants,
  Diagonal,
  DiagonalError,
  Event,
  RecurringInterval,
  Token,
  UpdateChargeBehaviour,
  Subscription as DiagonalSubscription,
  Signature,
  Charge,
  Chain,
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
 *  Checkout session
 */

app.post('/create-checkout-session/', async (req, res) => {
  /*

      While creating a checkout session, you can create a Diagonal customer
      so that you can later use it to identify the user of a given subscription, e.g.:

      ```
        const user = UserTable.findOne({
          req.user.id
        })

        let diagonalCustomerId = user.diagonalCustomerId;
        if (diagonalCustomerId === undefined) {
          const diagonalCustomer = await diagonal.customers.create({
            email: user.email,
            name: user.name,
            reference: user.id
          })

          const user = UserTable.update(user.id, {
            diagonalCustomerId: diagonalCustomer.id,
          })

          diagonalCustomerId = diagonalCustomer.id
        }
      ```

  */
  let customerId // diagonalCustomer.id

  const planId = req.body.planId

  // Fetch plan from your database or from any another provider
  const plan = {
    amount: '10',
    tokens: [Token.DAI, Token.USDC],
    chains: [Chain.ETHEREUM, Chain.POLYGON],
    interval: RecurringInterval.MONTH,
    intervalCount: 1,
  }

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
    reference: planId,
    customer_id: customerId,
  })

  res.redirect(checkoutSession.url)
})

/**
 *  Subscriptions operations
 */

app.post('/upgrade-subscription/:id', async (req, res) => {
  /*

      You can upgrade or downgrade a subscription by updating the subscription's amount
      and/or interval. The subscription will be updated immediately. If a charge
      is required to update the subscription, it will be automatically created.

      Refer to the documentation: https://docs.diagonal.finance/docs/upgrade-or-downgrade-subscriptions
      for more information on the update behaviour, or to the API reference:
      https://docs.diagonal.finance/reference/subscriptions-update for the available parameters 
      you can provide.

  */

  const subscriptionId = req.params.id
  const updatedSubscription = await diagonal.subscriptions.update(
    subscriptionId,
    {
      billing_amount: '20',
      billing_interval: RecurringInterval.MONTH,
      billing_interval_count: 1,
      charge_behaviour: UpdateChargeBehaviour.IMMEDIATE,
      prorate: true,
    },
  )

  res.sendStatus(200)
})

app.post('/cancel-subscription/:id', async (req, res) => {
  const subscriptionId = req.params.id

  /*

      You can cancel a subscription immediately or at the end of the current billing period.
      Any outstanding amount will be charged immediately.

      Refer to the documentation: https://docs.diagonal.finance/docs/cancel-subscriptions
      for more information on the cancel behaviour, or to the API reference:
      https://docs.diagonal.finance/reference/subscriptions-cancel for the available parameters 
      you can provide.

  */
  const canceledSubscription = await diagonal.subscriptions.cancel(
    subscriptionId,
    {
      charge_behaviour: CancelChargeBehaviour.IMMEDIATE,
      end_of_period: true,
    },
  )

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
      console.warn(`Unhandled event type.`)
      break
  }

  // Return a 200 response to acknowledge receipt of the event
  res.sendStatus(200)
})

app.listen(3000, () => console.log('Running on port 3000'))

/**
 * Handlers
 */

/**
 * This handler is called when a signature charge request is received.
 *
 * It should create the ECDSA signature, using your signing key, and capture it using the SDK.
 *
 * @param diagonal Diagonal SDK instance
 * @param signatureRequest The signature request event data
 */
async function handleSignatureChargeRequest(
  diagonal: Diagonal,
  signatureRequest: Signature,
): Promise<void> {
  const charge = signatureRequest.data.charge
  const ecdsaSignature = diagonal.signatures.sign(signatureRequest, signingKey)

  await diagonal.charges.capture(charge.id, ecdsaSignature)
}

/**
 * This handler should be called when a charge.confirmed event is received.
 *
 * You may use this event to provide feedback during a subscription update,
 * as it represents the first confirmation of a charge.
 *
 * If you need to act as soon as the charge is confirmed, you can use
 * this event instead of charge.finalized, as the latter is only triggered
 * after the charge is considered final, which could take a few minutes,
 * depending on the chain.
 *
 * You may receive this event during:
 * 1. Subscription due payment
 * 2. Subscription creation payment
 * 3. Subscription update payment
 * 4. Subscription cancel payment
 *
 * @param charge The charge object received in the event
 */
async function handleChargeConfirmed(charge: Charge): Promise<void> {
  /*

      Getting the subscription from your database, e.g.:

      ```
        const subscriptionInDatabase = SubscriptionTable.findOne({
          diagonalSubscriptionId: charge.subscription_id,
        })
        if (!subscriptionInDatabase) return;
      ```

      Note: You may receive this event when a subscription is in past_due state,
      indicating the past due payment has now been confirmed. 
      
      If you want to update the status of your subscription to active again, 
      we recommend you do so on the `charge.finalized` event instead. 
      
      You can check the `charge.attempts_count` property, being greater than 1, 
      to determine if the charge is a past due payment or by checking the status of 
      the subscription in your database. 

  */
  switch (charge.reason) {
    case 'subscription_update':
      /*
          Upgrade/downgrade payment has succeeded, optionally update your database
          You can now give access to the updated plan to the user
      */
      break
    default:
      break
  }
}

/**
 * This handler should be called when a charge.finalized event is received.
 *
 * At this point the charge can be considered successful and final.
 *
 * You may receive this event during:
 * 1. Subscription due payment
 * 2. Subscription creation payment
 * 3. Subscription update payment
 * 4. Subscription cancel payment
 *
 * Note: Due to the nature of blockchain, this event may be received
 * within a few minutes of the charge.confirmed event. For this reason
 * you should not rely on this event to provide feedback to the user.
 *
 * @param charge The charge object received in the event
 */
async function handleChargeFinalized(charge: Charge): Promise<void> {
  /*

      Getting the subscription from your database, e.g.:

      ```
        const subscriptionInDatabase = SubscriptionTable.findOne({
          diagonalSubscriptionId: charge.subscription_id,
        })
        if (!subscriptionInDatabase) return;
      ```

      Note: You may receive this event when a subscription is in past_due state,
      indicating the past due payment has now been confirmed. 
      
      You can now update the subscription status to active, by checking the
      status is past due or through the `charge.attempts_count` property, 
      which is going to be greater than 1 e.g.:

      ```
        if (subscriptionInDatabase.status === SubscriptionStatus.PastDue) {
          SubscriptionTable.update(subscriptionInDatabase.id, {
            status: SubscriptionStatus.Active,
          })
        }
      ```

  */
  switch (charge.reason) {
    case 'subscription_due':
      /*
          Recurring payment has succeeded.
      */
      break
    case 'subscription_update':
      /*
          Payment for the subscription update has succeeded. 
      */
      break
    case 'subscription_cancel':
      /*
          Payment for subscription cancel has succeeded.
      */
      break
    case 'subscription_creation':
      /*
          Payment for subscription creation has succeeded.
      */
      break
    default:
      break
  }
}

/**
 * This handler should be called when a charge.failed event is received.
 *
 * If you receive this event, means that the charge is no longer going to be retried.
 * You may want to schedule any flow that is required to handle uncollected revenue.
 *
 * You may receive this event during:
 * 1. Subscription due payment
 * 2. Subscription creation payment
 * 3. Subscription update payment
 * 4. Subscription cancel payment
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
 * This handler should be called when a charge.attempt_failed event is received.
 *
 * You may want to use this event to contact the user in order to either increase their
 * allowance or balance.
 *
 * If you want to get the reason, check in the `charge.last_attempt_failure_reason` field,
 * and to obtain the next attempt date, received as seconds since the Unix epoch,
 * it will be available at `charge.next_attempt_at`.
 *
 * You may receive this event during:
 * 1. Subscription due payment
 * 2. Subscription update payment
 * 3. Subscription cancel payment
 *
 * Note: when creating a subscription, you will not receive this event, as the subscription
 * will be automatically expired if the first charge fails.
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

      If it is the first time the charge fails, the subscription in your database will still be active
      so you may want to transition it to the past_due status, e.g.:

      ```
        if (subscriptionInDatabase.status === SubscriptionStatus.Active) {
          SubscriptionTable.update(subscriptionInDatabase.id, {
            status: SubscriptionStatus.PastDue,
          })
        }:
      ```

  */

  /*

      Notify the user that the subscription charge failed, 
      through your preferred channel, e.g. email or push,
      based on the failure reason specified in `charge.last_attempt_failure_reason`

  */
  switch (charge.reason) {
    case 'subscription_due':
      /*
          The attempt to charge for a subscription due has failed.
      */
      break
    case 'subscription_update':
      /*
          The attempt to charge for an update has failed.
      */
      break
    case 'subscription_cancel':
      /*
          The attempt to charge for cancel has failed.
      */
      break
    default:
      break
  }
}

/**
 * This handler should be called when a subscription.created event is received.
 *
 * You can use this event to create a new subscription in your database and
 * link it to the user.
 *
 * Moreover, if you want to provide feedback though the UI, you can use this event
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
 * This handler should be called when a subscription.active event is received.
 *
 * This event is triggered when a subscription is activated, which can happen
 * during the creation of a subscription, or when a subscription transitions
 * from the past_due status to the active status.
 *
 * @param subscription The subscription object received in the event
 */
async function handleSubscriptionActive(
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
    
      You can also receive this event when the subscription transitions from 
      past_due to active, so you may want to handle each case separately, e.g.:

      ```
        switch (subscriptionInDatabase.status) {
          case 'created':
            SubscriptionTable.update(yourSubscription.id, {
              status: SubscriptionStatus.Active,
            })

            // Perform any action that is required when a subscription is created
            break;
          default:
            break;
        }
      ```

  */
}

/**
 * This handler should be called when a subscription.updated event is received.
 *
 * You will receive this event whenever we update any attribute of the subscription.
 *
 * @param subscription The subscription object received in the event
 */
async function handleSubscriptionUpdated(
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
  */

  switch (subscription.status) {
    case 'active':
      /* 

          You can receive an update for an active subscription when it's updated through the
          https://docs.diagonal.finance/reference/subscriptions-update endpoint or 
          when a successful due payment is made.

          If you store the plan or product in the subscription reference, and you provided 
          it during the update, you can use it to act accordingly, e.g.:

          ```
            if (subscriptionToUpdate.planId !== subscription.reference) {
              SubscriptionTable.update(subscription.id, {
                planId: subscription.reference!,
              })
            }
          ```

      */
      break
    case 'canceling':
      /*

          Handle the subscription transitions to canceling, which happens when you
          cancel the subscription through the https://docs.diagonal.finance/reference/subscriptions-cancel endpoint,
          with the `end_of_period` parameter set to `true`.

      */
      break
    case 'trialing':
      /*

          If a subscription gets updated during the trial period, you will
          receive an update with subscription status being trialing.

      */
      break
    default:
      break
  }
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

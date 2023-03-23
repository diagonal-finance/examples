import { Diagonal } from 'diagonal'
import { Request, Response } from 'express'
import { environment } from './environment'
import Stripe from 'stripe'
import { database } from '.'

export async function handleStripeRequest(
    request: Request,
    response: Response,
    stripe: Stripe,
    diagonal: Diagonal,
): Promise<void> {
    const signatureHeader = request.headers['stripe-signature']
    if (!signatureHeader) {
        response
            .status(400)
            .send({ error: { message: 'Missing signature header' } })
        return
    }

    let event
    try {
        event = stripe.webhooks.constructEvent(
            request.body,
            signatureHeader,
            environment.STRIPE_WEBHOOK_SECRET,
        )
    } catch (err) {
        response.status(400).send({ error: { message: err.message } })
        return
    }

    console.log('----\nHandling Stripe event: ' + event.type)

    switch (event.type) {
        case 'invoice.payment_succeeded':
            /**
             * Received whenever the payment has succeeded for that specific invoice
             *
             * Note: this will only happen when the payment happens in fiat.
             */
            break
        case 'invoice.payment_failed':
            /**
             * Received whenever the payment has failed for that specific invoice. At this point,
             * the subscription will transition to `past_due`.
             *
             * Use this webhook to notify your user that their payment has
             * failed and to update card details.
             *
             * Note: this will only happen when the payment happens in fiat.
             */
            break
        case 'customer.subscription.deleted':
            if (event.request !== null) {
                // The subscription has been canceled by your request
                return
            }

            // handle subscription cancelled automatically based
            // upon your subscription settings.
            break
        case 'customer.subscription.created':
            {
                const subscription = event.data.object as Stripe.Subscription
                const customer = await database.customer.findByStripeId(
                    subscription.customer as string,
                )

                await database.customer.update(customer.id, {
                    stripeSubscriptionId: subscription.id,
                })
            }
            break
        case 'customer.subscription.trial_will_end':
            // Send notification to your user that the trial will end
            break
        case 'invoice.created':
            {
                /**
                 * Received on invoice creation.
                 *
                 * For crypto settled subscriptions, we manually transition this invoice to `finalized`
                 * before creating charges to it, in order to prevent any further mutation on the invoice.
                 */
                const invoice = event.data.object as Stripe.Invoice
                const customer = await database.customer.findByStripeId(
                    invoice.customer as string,
                )

                // We're only interested in invoices created with `send_invoice` collection method.
                // Fiat subscriptions will contain the `charge_automatically`.
                if (invoice.collection_method === 'charge_automatically') {
                    if (invoice.billing_reason === 'subscription_create') {
                        // Retrieve the payment intent used to pay the subscription
                        const payment_intent =
                            await stripe.paymentIntents.retrieve(
                                invoice.payment_intent as string,
                            )

                        // Update your customer to assing the default payment method
                        // being used
                        await database.customer.update(customer.id, {
                            paymentMethodId:
                                payment_intent.payment_method as string,
                            paymentMethodType: 'fiat',
                        })
                    }
                    return
                }

                await stripe.invoices.finalizeInvoice(invoice.id)
            }
            break
        case 'invoice.finalized':
            {
                const invoice = event.data.object as Stripe.Invoice

                if (invoice.status !== 'open') return
                if (typeof invoice.customer !== 'string') return

                // We're only interested in invoices created with `send_invoice` collection method.
                // Fiat subscriptions will contain the `charge_automatically`.
                if (invoice.collection_method === 'charge_automatically') return

                const customer = await database.customer.findByStripeId(
                    invoice.customer,
                )

                await diagonal.charges.create(
                    {
                        // We attach the invoice id in the reference, so we can use it to retrieve the
                        // invoice when handling Diagonal charge events.
                        reference: invoice.id,
                        amount: String(invoice.amount_due / 100),
                        payment_method_id: customer.paymentMethodId!,
                    },
                    {
                        // In order to prevent multiple charges for the same invoice being created,
                        // we recommend providing the invoice.id as the idempotency key for the charge.
                        idempotency_key: invoice.id,
                    },
                )
            }
            break
        default:
            console.log(`Unhandled event type ${event.type}`)
            response.status(404).send({ message: 'Unknown event type' })
            return
    }

    console.log('Success handling of event\n----')

    response.sendStatus(200)
}

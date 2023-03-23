import { Constants, Diagonal, Event } from 'diagonal'
import { Request, Response } from 'express'
import { database } from '.'
import Stripe from 'stripe'
import { environment } from './environment'

/*
 *
 * Handling webhook events
 *
 */
export async function handleDiagonalRequest(
    request: Request,
    response: Response,
    stripe: Stripe,
    diagonal: Diagonal,
) {
    const signatureHeader = request.headers[
        Constants.SIGNATURE_HEADER_KEY
    ] as string
    if (!signatureHeader) {
        response
            .status(400)
            .send({ error: { message: 'Missing signature header' } })
        return
    }

    let event: Event
    try {
        event = diagonal.webhooks.constructEvent(
            request.body,
            signatureHeader,
            environment.DIAGONAL_WEBHOOK_SECRET,
        )
    } catch (err) {
        response.status(400).send({ error: { message: err.message } })
        return
    }

    console.log('----\nHandling Diagonal event: ' + event.type)

    switch (event.type) {
        case 'checkout_session.complete_request':
            {
                const checkoutSession = event.data
                if (typeof checkoutSession.customer_id !== 'string') return
                if (typeof checkoutSession.payment_method_id !== 'string')
                    return

                // Reference is set with the Stripe price ID while Checkout session creation
                if (typeof checkoutSession.reference !== 'string') return
                const stripePriceId = checkoutSession.reference

                const paymentMethod = await diagonal.payment.methods.get(
                    checkoutSession.payment_method_id,
                )
                if (paymentMethod === null) return

                await database.customer.update(checkoutSession.customer_id, {
                    paymentMethodId: checkoutSession.payment_method_id,
                    paymentMethodType: 'crypto',
                })

                await stripe.customers.update(checkoutSession.customer_id, {
                    // [Optional] We store the payment method information in the Stripe customer
                    metadata: {
                        diag_pm_id: paymentMethod.id,
                        diag_pm_token: paymentMethod.wallet.token,
                        diag_pm_chain: paymentMethod.wallet.chain,
                        diag_pm_address: paymentMethod.wallet.address,
                    },
                    invoice_settings: {
                        // We remove the default payment method, so given a customer, we're able to know if it's
                        // using a wallet or a Card as default.
                        default_payment_method: '',
                    },
                })

                await stripe.subscriptions.create(
                    {
                        customer: checkoutSession.customer_id,
                        items: [{ price: stripePriceId }],

                        // This is an important part. For subscriptions settled with Diagonal, the creation
                        // in Stripe must be done with the `collection_method` being `send_invoice`, otherwise
                        // Stripe will try to charge the user with any payment method attached to the customer.
                        collection_method: 'send_invoice',
                        days_until_due: 0, // Subscription is marked as past_due after
                    },
                    { idempotencyKey: checkoutSession.id },
                )
            }
            break
        case 'charge.confirmed':
            {
                const charge = event.data

                // Reference has been set with the Stripe Invoice ID while creating the charge
                if (typeof charge.reference !== 'string') return

                // Confirmed Charges will always have a transaction
                if (!charge.transaction) return

                // [Optional]: We can add charge metadata to the invoice for any manual management
                // through Stripe Dashboard
                await stripe.invoices.update(
                    charge.reference,
                    {
                        metadata: {
                            ['transaction_explorer_url']:
                                charge.transaction.explorer_url,
                            ['chain']: charge.chain,
                            ['token']: charge.token,
                        },
                    },
                    { idempotencyKey: 'update-' + charge.id },
                )

                // We mark the invoice as being paid in Stripe
                await stripe.invoices.pay(
                    charge.reference,
                    {
                        paid_out_of_band: true,
                    },
                    {
                        idempotencyKey: 'pay-' + charge.id,
                    },
                )

                // [Optional]: Send invoice
                await stripe.invoices.sendInvoice(charge.reference, {
                    idempotencyKey: 'send-' + charge.id,
                })
            }
            break
        case 'charge.attempt_failed':
            {
                const charge = event.data
                if (typeof charge.customer_id !== 'string') return

                // Optional: Send email for failed charge.
                // Note: Diagonal can also take care these emails if customer email is provided on creation - for instance during the checkout session creation.
            }
            break
        case 'charge.failed':
            {
                /**
                 * When you receive a `charge.failed` it means the max attempts for the given charge have been reached.
                 * That is: more than 21 days have passed since the first attempt.
                 *
                 * You can either create a new charge, if you want to extend further the window, or mark the invoice
                 * as uncollectible, as no further attempts will be made to settle the charge.
                 */
                const charge = event.data
                // Reference should be defined with the invoice id.
                if (typeof charge.reference !== 'string') return

                await stripe.invoices.markUncollectible(charge.reference, {
                    idempotencyKey: 'uncollectible-' + charge.id,
                })
            }
            break
        case 'signature.charge.request':
            {
                /**
                 * Charges require the signature to be relayed on-chain. More details in how the flow works can be found in
                 * - https://docs.diagonal.finance/docs/diagonal-charge
                 * - https://docs.diagonal.finance/reference/signatures
                 */
                const signature = event.data
                const charge = signature.data.charge

                const ecdsaSignature = diagonal.signatures.sign(
                    signature,
                    environment.DIAGONAL_SIGNER_PRIVATE_KEY,
                )

                await diagonal.charges.capture(charge.id, ecdsaSignature)
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

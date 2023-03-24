import cookieParser from 'cookie-parser'
import { Diagonal } from 'diagonal'
import express, { NextFunction, Request, Response } from 'express'
import Stripe from 'stripe'

import { environment } from './environment'

import { Database } from './database'
import { handleDiagonalRequest } from './diagonal'
import { handleStripeRequest } from './stripe'

const app = express()

const stripe = new Stripe(environment.STRIPE_API_SECRET, {
    apiVersion: '2022-11-15',
})

const diagonal = new Diagonal(environment.DIAGONAL_API_SECRET)

// Simulate a fictional database
export const database = new Database()

// Use cookies to simulate logged in user.
app.use(cookieParser())

// Use JSON parser for parsing payloads as JSON on all non-webhook stripe routes.
app.use((req, res, next) => {
    if (req.originalUrl === '/stripe/webhook') {
        next()
    } else {
        express.json()(req, res, next)
    }
})

// Error middleware for catching unhandled errors
const handler =
    (fn: (req: Request, res: Response, next: NextFunction) => void) =>
    (req: Request, res: Response, next: NextFunction) => {
        return Promise.resolve(fn(req, res, next)).catch(next)
    }

/**
 * ----------------------------
 *  Checkout
 * ----------------------------
 */

/**
 * Fetch all available plans
 */
app.get(
    '/plans',
    handler(async (_, res) => {
        const prices = await stripe.prices.list({
            expand: ['data.product'],
        })

        res.send({
            prices: prices.data,
        })
    }),
)

app.post(
    '/diagonal/checkout',
    handler(async (req, res) => {
        // Simulate authenticated user
        const customerId = req.cookies['customer']

        const body = req.body as {
            priceId: string
        }

        const price = await stripe.prices.retrieve(body.priceId)

        const { interval, interval_count } =
            price.recurring as Stripe.Price.Recurring
        if (interval === 'day') {
            return res.status(400).send({
                error: { message: 'Unsupported day interval for price' },
            })
        }

        const unitAmount = price.unit_amount as number
        const amount = String(unitAmount / 100)

        const url = new URL(req.get('Referrer') ?? 'http://localhost:3000')
        const session = await diagonal.checkout.sessions.create({
            success_url: url.origin + '/account',
            cancel_url: url.origin + '/account',
            amount,
            subscription: {
                interval,
                interval_count,
            },
            // You can create a Diagonal customer, or just relate if already exists, with the ID of your choice.
            // For this case, it's your own customer id.
            customer: {
                id: customerId,
            },
            // We add the price Id in the reference of the Checkout Session so when we handle the `checkout_session.complete_request` event,
            // we know the price to create the subscription for.
            reference: price.id,
        })

        res.json({ url: session.url })
    }),
)

app.post(
    '/stripe/checkout',
    handler(async (req, res) => {
        // Simulate authenticated user
        const customerId = req.cookies['customer']
        const customer = await database.customer.findById(customerId)

        const body = req.body as {
            priceId: string
        }

        const url = new URL(req.get('Referrer') ?? 'http://localhost:3000')
        const session = await stripe.checkout.sessions.create({
            success_url: url.origin + '/account',
            cancel_url: url.origin + '/account',
            line_items: [{ price: body.priceId, quantity: 1 }],
            customer: customer.stripeId,
            mode: 'subscription',
        })

        res.json({ url: session.url })
    }),
)

/**
 * ----------------------------
 *  Payment method management
 * ----------------------------
 */

app.post(
    '/diagonal/add-wallet',
    handler(async (req, res) => {
        // Simulate authenticated user
        const customerId = req.cookies['customer']

        const url = new URL(req.get('Referrer') ?? 'http://localhost:3000')
        const session = await diagonal.setup.sessions.create({
            success_url: url.origin + '/account',
            cancel_url: url.origin + '/account',
            // We create a Diagonal customer, or just relate if already exists, with the `customerId` of your choice.
            // For this case, it's your own customer id.
            customer: {
                id: customerId,
            },
        })

        res.json({ url: session.url })
    }),
)

app.post(
    '/stripe/add-card',
    handler(async (req, res) => {
        // Simulate authenticated user
        const customerId = req.cookies['customer']
        const customer = await database.customer.findById(customerId)

        const url = new URL(req.get('Referrer') ?? 'http://localhost:3000')
        const session = await stripe.checkout.sessions.create({
            success_url: url.origin + '/account',
            cancel_url: url.origin + '/account',
            customer: customer.stripeId,
            payment_method_types: ['card'],
            mode: 'setup',
        })

        res.json({ url: session.url })
    }),
)

/**
 * Select from the available payment methods, cards or wallets,
 * the default one to pay for the subscription.
 */
app.post(
    '/set-default-payment-method',
    handler(async (req, res) => {
        // Simulate authenticated user
        const customerId = req.cookies['customer']
        const customer = await database.customer.findById(customerId)
        if (customer.stripeSubscriptionId === null) {
            return res
                .status(400)
                .send({ error: { message: 'Subscription not found' } })
        }

        const { paymentMethodId, isWallet } = req.body as {
            isWallet: boolean
            paymentMethodId: string
        }

        if (isWallet) {
            await stripe.subscriptions.update(customer.stripeSubscriptionId, {
                collection_method: 'send_invoice',
                days_until_due: 0,
            })
        } else {
            await stripe.subscriptions.update(customer.stripeSubscriptionId, {
                collection_method: 'charge_automatically',
                default_payment_method: paymentMethodId,
            })
        }

        await database.customer.update(customerId, {
            paymentMethodId,
            paymentMethodType: 'crypto',
        })

        res.sendStatus(200)
    }),
)

/**
 * ----------------------------
 *  Account details
 * ----------------------------
 */

/**
 * Fetch all the account details:
 *
 * - Payment methods:  Cards, wallets and the selected one for paying the subscription
 * - Subscription: Current subscription for this customer
 *
 */
app.get(
    '/account',
    handler(async (req, res) => {
        // Simulate authenticated user
        const customerId = req.cookies['customer']
        const customer = await database.customer.findById(customerId)
        if (customer.stripeSubscriptionId === null) {
            return res
                .status(400)
                .send({ error: { message: 'Subscription not found' } })
        }

        const fiatPaymentMethods = await stripe.paymentMethods.list({
            customer: customerId,
            type: 'card',
            limit: 50,
        })

        const cryptoPaymentMethods = await diagonal.payment.methods.list({
            customer_id: customerId,
            limit: 50,
        })

        const subscription = await stripe.subscriptions.retrieve(
            customer.stripeSubscriptionId,
            {
                // Expanding customer in order to also retrieve the metadata from the Diagonal Payment method, if it's data
                // necessary to be shown when listing a subscription
                expand: ['default_payment_method', 'customer'],
            },
        )

        res.json({
            paymentMethods: {
                default: customer.paymentMethodId,
                cards: fiatPaymentMethods.data,
                wallets: cryptoPaymentMethods.data,
            },
            subscription,
        })
    }),
)

/**
 * ----------------------------
 *  Subscriptions
 * ----------------------------
 */

app.post(
    '/subscription/cancel',
    handler(async (req, res) => {
        // Simulate authenticated user
        const customerId = req.cookies['customer']
        const customer = await database.customer.findById(customerId)
        if (customer.stripeSubscriptionId === null) {
            return res
                .status(400)
                .send({ error: { message: 'Subscription not found' } })
        }

        const deletedSubscription = await stripe.subscriptions.cancel(
            customer.stripeSubscriptionId,
        )

        res.json({ subscription: deletedSubscription })
    }),
)

app.post(
    '/subscription/update',
    handler(async (req, res) => {
        const customerId = req.cookies['customer']
        const customer = await database.customer.findById(customerId)
        if (customer.stripeSubscriptionId === null) {
            return res
                .status(400)
                .send({ error: { message: 'Subscription not found' } })
        }

        const body = req.body as {
            priceId: string
        }

        const subscription = await stripe.subscriptions.retrieve(
            customer.stripeSubscriptionId,
        )
        const updatedSubscription = await stripe.subscriptions.update(
            customer.stripeSubscriptionId,
            {
                items: [
                    {
                        id: subscription.items.data[0].id,
                        price: body.priceId,
                    },
                ],
            },
        )
        res.json({ subscription: updatedSubscription })
    }),
)

/**
 * ----------------------------
 *  Customer
 * ----------------------------
 */

/**
 * Create the customer
 *
 * This simulates the registration of your customer.
 *
 * 1. Creates the Stripe customer
 * 2. Creates in your Database
 * 3. Uses a cookie to simulate the authentication method
 */
app.post(
    '/create-customer',
    handler(async (req, res) => {
        const customerId = req.cookies['customer']

        const stripeCustomer = await stripe.customers.create(
            {
                email: req.body.email,
            },
            { idempotencyKey: customerId },
        )

        const customer = await database.customer.create({
            name: req.body.name,
            email: req.body.email,
            stripeId: stripeCustomer.id,
        })

        // Save the customer.id in your database alongside your user.
        // We're simulating authentication with a cookie.
        res.cookie('customer', customer.id, { maxAge: 9000000, httpOnly: true })

        res.json({ customer: customer })
    }),
)

/**
 * ----------------------------
 *  Webhooks
 * ----------------------------
 */
app.post(
    '/stripe/webhook',
    express.raw({ type: 'application/json' }),
    async (req, res) => {
        await handleStripeRequest(req, res, stripe, diagonal)
    },
)

app.post(
    '/diagonal/webhook',
    handler(async (req, res) => {
        await handleDiagonalRequest(req, res, stripe, diagonal)
    }),
)

app.use((err: Error, _: Request, res: Response) => {
    if (!(err instanceof Error)) return
    console.error(err)
    res.status(500).send(err.message)
})

app.listen(4242, () =>
    console.log(`Node server listening on port http://localhost:${4242}!`),
)

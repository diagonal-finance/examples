/**
 * This represents a fictional email service just for demonstration purposes.
 *
 * It is meant to illustrate how would an integration send emails, in the following cases:
 * - Subscription canceled due to blacklisting
 * - Subscription canceled due to payment failure
 * - Subscription canceled by user
 * - Invoice payment failed
 *     - With card
 *     - With wallet
 *         - With insufficient allowance
 *         - With insufficient balance
 * - Invoice payment succeeded
 *     - With card
 *     - With wallet
 */

import { formatDistanceToNow } from 'date-fns'
import { Charge } from 'diagonal'
import Stripe from 'stripe'

enum Template {
    InvoicePaymentSucceeded = 'InvoicePaymentSucceeded',
    InvoicePaymentFailedCard = 'InvoicePaymentFailedCard',
    InvoicePaymentFailedWalletAllowance = 'InvoicePaymentFailedWalletAllowance',
    InvoicePaymentFailedWalletBalance = 'InvoicePaymentFailedWalletBalance',
    SubscriptionCanceledUser = 'SubscriptionCanceledUser',
    SubscriptionCanceledPaymentFailed = 'SubscriptionCanceledPaymentFailed',
    SubscriptionCanceledBlacklisted = 'SubscriptionCanceledBlacklisted',
    SubscriptionTrialWillEnd = 'SubscriptionTrialWillEnd',
}

type BaseTemplate<Name extends Template, Data = undefined> = {
    name: Name
    data: Data
}

type ChargeAttemptFailedAllowance = BaseTemplate<
    Template.InvoicePaymentFailedWalletAllowance,
    {
        amount: string
        token: string
        chain: string
        address: string
        next_attempt_at: string
    }
>
type ChargeAttemptFailedBalance = BaseTemplate<
    Template.InvoicePaymentFailedWalletBalance,
    {
        amount: string
        token: string
        chain: string
        address: string
        next_attempt_at: string
    }
>
type PaymentSucceeded = BaseTemplate<
    Template.InvoicePaymentSucceeded,
    {
        amount: string
        currency: string
        payment_description?: string
        payment_method: string
        receipt_date: string
        receipt_id: string
        invoice_id: string
        invoice_url: string
        transaction_hash?: string
        transaction_explorer_url?: string
    }
>
type SubscriptionCanceledBlacklisted = BaseTemplate<
    Template.SubscriptionCanceledBlacklisted,
    {
        chain: string
        address: string
    }
>
type SubscriptionCanceledPaymentFailed =
    BaseTemplate<Template.SubscriptionCanceledPaymentFailed>
type SubscriptionCanceledUser = BaseTemplate<Template.SubscriptionCanceledUser>
type SubscriptionTrialWillEnd = BaseTemplate<
    Template.SubscriptionTrialWillEnd,
    {
        trial_end?: string
    }
>
type InvoicePaymentFailed = BaseTemplate<
    Template.InvoicePaymentFailedCard,
    {
        next_attempt_at?: string
    }
>

type TemplateData = {
    [Template.InvoicePaymentSucceeded]: PaymentSucceeded['data']
    [Template.InvoicePaymentFailedCard]: InvoicePaymentFailed['data']
    [Template.InvoicePaymentFailedWalletAllowance]: ChargeAttemptFailedAllowance['data']
    [Template.InvoicePaymentFailedWalletBalance]: ChargeAttemptFailedBalance['data']
    [Template.SubscriptionCanceledBlacklisted]: SubscriptionCanceledBlacklisted['data']
    [Template.SubscriptionCanceledPaymentFailed]: SubscriptionCanceledPaymentFailed['data']
    [Template.SubscriptionCanceledUser]: SubscriptionCanceledUser['data']
    [Template.SubscriptionTrialWillEnd]: SubscriptionTrialWillEnd['data']
}

export class EmailClient {
    private static BASE_CONFIGURATION = {
        organisation_logo_url: 'your-logo-url-here',
        organisation_legal_address: 'your-address-here',
        organisation_email: 'your-contact-email-here',
        organisation_name: 'your-organisation-name-here',
    }

    static async sendInvoicePaymentSucceededCard(
        email: string,
        data: {
            invoice: Stripe.Invoice
            paymentMethod: Stripe.PaymentMethod
        },
    ) {
        const { invoice, paymentMethod } = data
        this.sendEmail(
            {
                name: Template.InvoicePaymentSucceeded,
                data: {
                    invoice_id: invoice.id,
                    invoice_url: invoice.hosted_invoice_url ?? '',
                    amount: invoice.amount_paid?.toString() ?? '',
                    currency: invoice.currency,
                    payment_description: invoice.description ?? undefined,
                    payment_method: `Card ${paymentMethod.card?.brand} ending in ${paymentMethod.card?.last4}`,
                    receipt_date: formatDistanceToNow(invoice.created * 1000),
                    receipt_id: invoice.receipt_number ?? '',
                },
            },
            email,
        )
    }

    static async sendInvoicePaymentFailedCard(
        email: string,
        data: {
            invoice: Stripe.Invoice
        },
    ) {
        const { invoice } = data
        const nextAttempt =
            invoice.next_payment_attempt !== null
                ? formatDistanceToNow(invoice.next_payment_attempt * 1000)
                : undefined
        this.sendEmail(
            {
                name: Template.InvoicePaymentFailedCard,
                data: {
                    next_attempt_at: nextAttempt,
                },
            },
            email,
        )
    }

    static async sendSubscriptionCanceledPaymentFailed(email: string) {
        this.sendEmail(
            {
                name: Template.SubscriptionCanceledPaymentFailed,
            },
            email,
        )
    }

    static async sendSubscriptionCanceledUser(email: string) {
        this.sendEmail(
            {
                name: Template.SubscriptionCanceledUser,
            },
            email,
        )
    }

    static async sendInvoicePaymentSuccessWallet(
        email: string,
        data: {
            invoice: Stripe.Invoice
            charge: Charge
        },
    ) {
        const { invoice, charge } = data

        // Confirmed Charges will always have a transaction
        if (!charge.transaction) return

        const address = charge.source_address

        this.sendEmail(
            {
                name: Template.InvoicePaymentSucceeded,
                data: {
                    invoice_id: invoice.id,
                    invoice_url: invoice.hosted_invoice_url ?? '',
                    amount: invoice.amount_paid?.toString() ?? charge.amount,
                    currency: charge.token,
                    payment_description: invoice.description ?? undefined,
                    payment_method: `Wallet ${charge.chain}:${address}`,
                    receipt_date: formatDistanceToNow(invoice.created * 1000),
                    receipt_id: invoice.receipt_number ?? charge.id,
                    transaction_hash: charge.transaction.hash,
                    transaction_explorer_url: charge.transaction.explorer_url,
                },
            },
            email,
        )
    }

    static async sendInvoicePaymentFailedWallet(
        email: string,
        data: {
            charge: Charge
        },
    ) {
        const { charge } = data

        // Attempted Charges will always have a last_attempt_failure_reason
        // and next_attempt_at
        if (!charge.last_attempt_failure_reason) return
        if (!charge.next_attempt_at) return

        const address = charge.source_address

        // When 'address_blacklisted_by_usdc' is returned, the charge is
        // not retried. The charge.failed event is sent instead.
        const template =
            charge.last_attempt_failure_reason ===
            'insufficient_spending_allowance'
                ? Template.InvoicePaymentFailedWalletAllowance
                : Template.InvoicePaymentFailedWalletBalance

        this.sendEmail(
            {
                name: template,
                data: {
                    amount: charge.amount.toString(),
                    token: charge.token,
                    chain: charge.chain,
                    address,
                    next_attempt_at: formatDistanceToNow(
                        charge.next_attempt_at * 1000,
                    ),
                },
            },
            email,
        )
    }

    static async sendSubscriptionTrialWillEnd(
        email: string,
        data: {
            subscription: Stripe.Subscription
        },
    ) {
        const { subscription } = data

        const trialEnd =
            subscription.trial_end !== null
                ? formatDistanceToNow(subscription.trial_end * 1000)
                : null

        this.sendEmail(
            {
                name: Template.SubscriptionTrialWillEnd,
                data: {
                    trial_end: trialEnd ?? undefined,
                },
            },
            email,
        )
    }

    private static sendEmail<T extends Template>(
        template: TemplateData[T] extends undefined
            ? { name: T; data?: TemplateData[T] }
            : { name: T; data: TemplateData[T] },
        toAddress: string,
    ): void {
        const emailPayload = {
            Destination: {
                ToAddresses: [toAddress],
            },
            Template: template.name,
            TemplateData: {
                ...template.data,
                ...this.BASE_CONFIGURATION,
            },
            ReplyToAddresses: [
                `${this.BASE_CONFIGURATION.organisation_name} <contact@example.com>`,
            ],
            Source: `${this.BASE_CONFIGURATION.organisation_name} <billing@example.com>`,
        }
        console.log('Sending email', JSON.stringify(emailPayload, null, 2))
    }
}

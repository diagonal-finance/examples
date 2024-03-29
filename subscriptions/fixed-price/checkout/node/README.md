# Fixed price subscriptions checkout

An [Express server](http://expressjs.com) implementation.

---

## Inline database snippets

Throughout the example integrations we inline short "database snippets", which are meant to provide a high level guide
for how to use Diagonal alongside your existing database. These snippets should be rewritten by yourself.

You are free to use any relational or non-relational database you like, but the current examples reference
`Subscription` and `User` relational database tables.

We recommend keeping track of the following attributes in your database of choice:

**Subscription Table**

```
    ...

    status: 'active' | 'canceling' | 'canceled' | 'trailing' | 'created' | 'past_due'
    diagonalSubscriptionId: string // Reference the Diagonal subscription id
    planId: string // ID of the plan or product the user has subscribed to
    userId: string // Relation to your user table

    ...
```

**User Table**

```
    ...

    diagonalCustomerId: string // Reference the Diagonal customer id

    ...
```

IMPORTANT:

- Keep track of the subscription status locally to avoid making requests to Diagonal API and risk hitting the rate limits.
- Keep track of Diagonal customer ids so you associate webhook events with customers.

---

## Notify

When handling webhook events such as 'charge.attempt_failed' or 'charge.confirmed', Diagonal recommends you notify your customer about the status of their subscription.

For example, when a charge attempt has failed, in order to reduce churn you may want to notify your customers about the failed charge, why it failed (`charge.last_attempt_failure_reason`), when it will be rescheduled (`charge.next_attempt_at`).

We provide a series of simple [email templates](https://docs.diagonal.finance/docs/dunning-flows) for your convenience that demonstrate how you can use Diagonal webhook events to extract relevant information and notify your customers accordingly.

If you are looking for a way to send automated emails, here are some popular options:

- [Twilio SendGrid](https://www.twilio.com/en-us/sendgrid/email-api)
- [Mailchimp](https://mailchimp.com/en-gb/features/transactional-email/?currency=EUR)
- [AWS SES](https://docs.aws.amazon.com/ses/latest/dg/send-email.html)
- [Mailgun](https://www.mailgun.com/)
- [Postmark](https://postmarkapp.com/)
- [Customer IO](https://customer.io/)

---

## Running the server

### Requirements

- Node v16+
- NPM v8+

### 1. Install dependencies

```
npm install
```

### 2. Add `.env` configuration file

Simply copy the `.env.example` file into `.env`, and then populate it with the appropriate values.

Description:

`DIAGONAL_API_SECRET` - Key necessary for making authorized requests to the Diagonal backend. Initailly will be provided by the Diagonal team. You can learn more about how to get Diagonal API key [here](https://docs.diagonal.finance/docs/quickstart-setup#step-1-create-your-signer-key-pair).

`DIAGONAL_SIGNER_PRIVATE_KEY` - Ethereum private key for signing incoming charge requests from the diagonal backend. To get more details, as well as learn how to create such key, please visit this [link](https://docs.diagonal.finance/docs/quickstart-setup#step-1-create-your-signer-key-pair).

`DIAGONAL_WEBHOOK_SECRET` - Webhook endpoint secret key. You can obtain this key when creating a [webhook configuration](https://docs.diagonal.finance/docs/webhooks#configuration).


### 3. Run the application:

Typescript:

```
npm run start-ts
```

or Javascript:

```
npm start
```

### 4. Interact with the server

Server has started at `localhost:3000`. You can interact with the server using the following endpoints:

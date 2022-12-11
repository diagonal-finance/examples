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

If you are looking for a way to send automated emails, here are some popular options:

- [Twilio SendGrid](https://www.twilio.com/en-us/sendgrid/email-api)
- [Mailchimp](https://mailchimp.com/en-gb/features/transactional-email/?currency=EUR)
- [AWS SES](https://docs.aws.amazon.com/ses/latest/dg/send-email.html)
- [Mailgun](https://www.mailgun.com/)
- [Postmark](https://postmarkapp.com/)
- [Customer IO](https://customer.io/)

---

## Requirements

- Node v10+
- [Configured .env file](../../../../README.md#env-config)

## How to run

1. Install dependencies

```
npm install
```

2. Run the application:

Typescript:

```
npm run start-ts
```

or Javascript:

```
npm start
```

3. You can interact with the server started at `localhost:3000`

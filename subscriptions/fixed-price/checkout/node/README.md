# Fixed price subscriptions checkout

An [Express server](http://expressjs.com) implementation.

## Inline database snippets

Throughout the example integrations we reference a `Subscription` and `User` relational database tables. These tables
are meant to provide a high level example, for how to handle the subscription lifecycle using Diagonal. Note, you are
of course free to use non-relational databases.

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
npm start-ts
```

or Javascript:

```
pnpm start
```

3. You can interact with the server started at `localhost:3000`

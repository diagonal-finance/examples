## Accept crypto and fiat subscriptions with Diagonal and Stripe

The example shows how to integrate [Diagonal](https://docs.diagonal.finance) with [Stripe](https://stripe.com/docs) to create a subscription service handling both fiat and crypto payments 🚀.

It includes a NodeJS [server](./server/node/README.md) written in Typescript with Exprees, and a Javascript React [client](./client/react/README.md). The server handles both Diagonal and Stripe webhooks, as well exposing a REST API consumed by the client.

- [Features](#features)
  * [Demo](#demo)
- [How to run locally](#how-to-run-locally)
  * [Server](#server)
    + [1. Install dependencies](#1-install-dependencies)
    + [2. Setup webhooks](#2-setup-webhooks)
    + [3. Environment variables](#3-environment-variables)
    + [4. Start](#4-start)
  * [Client](#client)
    + [Install dependencies](#install-dependencies)
    + [Start](#start)
- [Using the app](#using-the-app)
- [Design decisions](#design-decisions)

## Features

- Create a subscription and settle it in fiat or crypto.
- Add more payment methods, either card or a wallet.
- Change the default payment method.
- Cancel a subscription.

### Demo

https://user-images.githubusercontent.com/18260238/227162786-a691a6c6-b270-41fc-80f7-d0f9eadf1273.mp4

## How to run locally

You'll need to start both [server](./server/node/README.md) and [client](./client/react/README.md). The server is a NodeJS Express server, and the client is a React app. 

### Server

#### 1. Install dependencies

```bash
npm install --prefix server/node
```

#### 2. Setup webhooks

Follow the guide located at [server/node](./server/node/README.md#running-the-server)

#### 3. Environment variables

Setup in a `.env` file the `./server/node` folder, with the following variables:

```
DIAGONAL_WEBHOOK_SECRET=<secret from the webhook config creation response>
DIAGONAL_API_SECRET=<Diagonal api key secret>
DIAGONAL_SIGNER_PRIVATE_KEY=<signer private key to sign charge attestations>
STRIPE_WEBHOOK_SECRET=<secret from the webhook config creation response>
STRIPE_API_SECRET=<Stripe api key secret>
```

#### 4. Start

```bash
npm run start --prefix server/node/
```

The server will being served from `http://localhost:4242/`.

### Client

#### Install dependencies

```bash
npm install --prefix client/react
```

#### Start

```bash
npm start --prefix client/react
```

Your default browser should now open with the client being served from `http://localhost:3000/`.

## Using the app

When running both client and server, you are now ready to use the app running in [http://localhost:3000](http://localhost:3000).

1. Enter your email address
2. Select your plan
3. Select if you want to pay with crypto or fiat
4. Proceed to complete a checkout
    - For Fiat, you can use the test card number ([more details](https://stripe.com/docs/testing)):
        - Number: 4242 4242 4242 4242.
        - Valid future date, such as 12/34.
        - Any three-digit CVC.
        - Use any value you like for other form field.
    - For Crypto, if you're in test environment, you'll be able to mint the necessary tokens automatically during the session in order for you to complete it.
5. 🚀

## Design decisions

Some further explanation on certain design decisions made within the repo:

- **Diagonal acts only as a payment processor.** Stripe handles all information regarding subscriptions, customers, etc. Diagonal is only used to settle the payments, these being triggered by Stripe creation of invoices.
- **Management of the payment methods is done on your end**. Whenever the user adds a new payment method - either via Stripe or Diagonal - the default config is set on the demo database customer model, which is later used for subsequent payments - either fiat or crypto.
    - That being said, another approach if you want to remove this complexity in your end, is to store directly in Stripe customer metadata, and then update it whenever the user changes it.
- **Simple auth.** In order to reduce the overhead of auth - given this is just an example integration, as production authentication would vary substantially - it has been simplified to be cookie based.
- **Stripe customer ID as customer ID.** We’ve relied on Stripe customer ID as the unique ID for your customer in Diagonal. That being said, you can use your internal ID as long as you keep the relationship to the Stripe customer - to reconcile between your system and Stripe’s.

    **Note:** We enable creation of customers in our end with an ID of your choice, so will not be required to store Diagonal customer ID if you don’t want to.



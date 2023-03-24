## Diagonal with Stripe integration example

https://user-images.githubusercontent.com/18260238/227162786-a691a6c6-b270-41fc-80f7-d0f9eadf1273.mp4

## How to run locally

You'll need to start both client and server.

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


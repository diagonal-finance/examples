## Diagonal with Stripe integration example

https://user-images.githubusercontent.com/18260238/227162786-a691a6c6-b270-41fc-80f7-d0f9eadf1273.mp4

## Installation

### Client

#### Install dependencies

```bash
npm install --prefix client/react
```

### Server

#### Install dependencies

```bash
npm install --prefix server/node
```

## Running

### Client

```bash
npm start --prefix client/react
```

### Server

#### 1. Setup webhooks

Follow the guide located at [server/node](./server/node/README.md#running-the-server)

#### 2. Environment variables

Setup in a `.env` file the `./server/node` folder, with the following variables:

```
DIAGONAL_WEBHOOK_SECRET=<secret from webhook config created response>
DIAGONAL_API_SECRET=<Diagonal api key secret>
DIAGONAL_SIGNER_PRIVATE_KEY=<signer private key to sign charge attestations>
STRIPE_WEBHOOK_SECRET=<secret from webhook config created response>
STRIPE_API_SECRET=<Stripe api key secret>
```

#### 3. Start

```bash
npm run start --prefix server/node/
```

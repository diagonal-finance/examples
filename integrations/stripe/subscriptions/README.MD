## Diagonal with Stripe integration example

Example integration repo with Stripe.

<img src="./demo.mp4" alt="Preview of demo" style="max-width:25%;">

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

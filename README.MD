# Diagonal backend examples

In this repository you can find language specific examples for interaction with the Diagonal backend.

For more details visit: https://docs.diagonal.finance/ 

## `.env` config

Simply copy the `.env.example` file into `.env`, and then populate it with the appropriate values.

Description:

`DIAGONAL_API_KEY` - Key necessary for making authorized requests to the Diagonal backend. Initailly will be provided by the Diagonal team. You can learn more about how to get Diagonal API key [here](https://docs.diagonal.finance/docs/quickstart-setup#step-1-create-your-signer-key-pair).

`DIAGONAL_SIGNING_PRIVATE_KEY` - Ethereum private key for signing incoming charge requests from the diagonal backend. To get more details, as well as learn how to create such key, please visit this [link](https://docs.diagonal.finance/docs/quickstart-setup#step-1-create-your-signer-key-pair).

`DIAGONAL_WEBHOOK_ENDPOINT_SECRET` - Webhook endpoint secret key. You can obtain this key when creating a [webhook configuration](https://docs.diagonal.finance/docs/webhooks#configuration).
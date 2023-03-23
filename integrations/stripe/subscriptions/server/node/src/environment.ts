import * as envalid from 'envalid'

import dotenv from 'dotenv'
dotenv.config()

export const environment = envalid.cleanEnv(process.env, {
    DIAGONAL_WEBHOOK_SECRET: envalid.str({
        example: 'wsecret_test_KtjYJMPxxd73kKtjYJMPxxdDsL442d6',
        desc: 'Secret obtained while creating a webhook config. Starts with `wsecret_` and will contain `_test_` prefix for configs in test environment',
        docs: 'https://docs.diagonal.finance/reference/webhook-configs-create',
    }),
    DIAGONAL_API_SECRET: envalid.str({
        example: 'secret_test_1Mg73kKtjYJMPxxdDsL442d6',
    }),
    DIAGONAL_SIGNER_PRIVATE_KEY: envalid.str({
        example:
            '0x2bf40cfb9fbdb300245d159a34a56279df7ff794d1d4dec5a0b6f799536f3c40',
        desc: 'Signer private key for capturing charges',
        docs: 'https://docs.diagonal.finance/reference/signatures',
    }),
    DIAGONAL_URL: envalid.url({
        default: undefined,
        desc: 'Optional: Diagonal API endpoint. It will be inferred from the secret value structure',
    }),
    STRIPE_WEBHOOK_SECRET: envalid.str({
        desc: 'Stripe webhook secret for validating webhook requests header signatures',
        example: 'whsec_1Mg73kKtjYJ1Mg73kKtjYJMPxxdDsL442d6',
    }),
    STRIPE_API_SECRET: envalid.str({
        desc: 'Stripe API secret key',
        example:
            'sk_test_51Mg4Mg73kKtjYJ1Mg73kKtjYJMPxxMg73kKtjYJ1Mg73kKtjYMg73kKtjYJ1Mg73kKtjYJMPxxdDsL442f',
    }),
})

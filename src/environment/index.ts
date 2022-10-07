import 'dotenv/config'
import process from 'process'
import * as envalid from 'envalid'

class EnvironmentVariableError extends Error {}

export default envalid.cleanEnv(
  process.env,
  {
    DIAGONAL_API_BASE_URL: envalid.str({
      devDefault: 'https://api.test.diagonal.finance',
    }),
    SIGNER_PRIVATE_KEY: envalid.str({
      devDefault: '0x...',
    }),
    DIAGONAL_API_KEY: envalid.str({
      devDefault: 'secret_test_...',
    }),
    DIAGONAL_WEBHOOK_ENDPOINT_SECRET: envalid.str({
      devDefault: 'wsecret_',
    }),
    RPC_PROVIDER_URL: envalid.str({
      devDefault: 'https://eth-goerli.g.alchemy.com/v2/ALCHEMY_API_KEY',
    }),
    ORG_CONTRACT_ADDRESS: envalid.str({
      devDefault: '0x...',
    }),
    DIAGONAL_SIGNATURE_HEADER_KEY: envalid.str({
      devDefault: 'diagonal-signature',
    }),
  },
  {
    reporter: (args) => {
      const errors = Object.entries(args.errors)
      if (errors.length === 0) return

      let errorMessage = ''
      errors.forEach(([variableName, { name, message }]) => {
        errorMessage = `${errorMessage}${variableName}: ${
          message !== 'undefined' ? message : name
        }\n`
      })
      throw new EnvironmentVariableError(errorMessage)
    },
  },
)

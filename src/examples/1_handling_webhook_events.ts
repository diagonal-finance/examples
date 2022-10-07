import express from 'express'
import { handleChargeSignatureRequestEvent } from '../event_handlers/handle_charge_signature_request'
import { ChargeEventType } from '../types/charge'
import { verifyWebhook } from '../utils/verify_webhook'
import environment from '../environment'

export const webhookEndpoint = `/onWebhookEvent`

const app = express()

app.use(express.json()) // to support JSON-encoded bodies
app.use(express.urlencoded()) // to support URL-encoded bodies

app.get('/', (_req, res) => {
  res.json({ success: true })
})

app.post(webhookEndpoint, async (req, res) => {
  try {
    let endpointSecret = environment.DIAGONAL_WEBHOOK_ENDPOINT_SECRET as string
    let payload = req.body

    let signatureHeader = req.headers['diagonal-signature']

    const event = verifyWebhook(
      payload,
      signatureHeader as string,
      endpointSecret,
    )
    console.log(
      'Webhook event successfully received and decoded, handing data...',
    )

    if (event.type === ChargeEventType.signatureRequest) {
      // handle signature request
      await handleChargeSignatureRequestEvent(event)
      console.log('Charge Signature request handled successfully')
    }

    console.log('Webhook event successfully handled, responding with 200 OK')
    res.status(200)
    res.json({ success: 'true' })
  } catch (error) {
    console.log('Webhook event error', { error })
    res.status(500)
    res.json({ error: error.message })
  }
})

// start the express server
app.listen(environment.SERVER_PORT, () => {
  console.log(
    `helper server started at http://localhost:${environment.SERVER_PORT}`,
  )
})

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

    let signatureHeader = req.headers[environment.DIAGONAL_SIGNATURE_HEADER_KEY]

    const event = verifyWebhook(
      payload,
      signatureHeader as string,
      endpointSecret,
    )

    if (event.type === ChargeEventType.signatureRequest) {
      // handle signature request
      await handleChargeSignatureRequestEvent(event)
    }

    res.status(200)
    res.json({ success: 'true' })
  } catch (error) {
    res.status(500)
    res.json({ error: error.message })
  }
})

// start the express server
app.listen(8091, () => {
  console.log(
    `server started at http://localhost:8091`,
  )
})

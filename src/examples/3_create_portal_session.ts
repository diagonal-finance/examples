import express from 'express'
import environment from '../environment'
import fetch from 'cross-fetch'
import { ICreatePortalSession } from '../types/portal_session'

export const portalSessionEndpoint = `/createPortalSession`

const app = express()

app.use(express.json()) // to support JSON-encoded bodies
app.use(express.urlencoded()) // to support URL-encoded bodies

app.get('/', (_req, res) => {
  res.json({ success: true })
})

app.post(portalSessionEndpoint, async (_, res) => {
    let apiKey = environment.DIAGONAL_API_KEY as string
    let diagonalApiBaseUrl = environment.DIAGONAL_API_BASE_URL as string

    const createPortalSession: ICreatePortalSession = {
        "return_url": "https://chainwire.net",
        "subscription_id": "sub_7yLaK-YqZJ-8tUvw",
    }

    const response = await fetch(`${diagonalApiBaseUrl}/v1/portal/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify(createPortalSession),
      })

      const responseBody = await response.json();
      const portalSessionUrl = responseBody.url;
      res.redirect(303, portalSessionUrl)
})

// start the express server
app.listen(8093, () => {
  console.log(
    `server started at http://localhost:8093`,
  )
})

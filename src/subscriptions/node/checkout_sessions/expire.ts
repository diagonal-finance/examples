import * as dotenv from 'dotenv'
import express, { Request, Response } from 'express'

import { Diagonal } from '@diagonal-finance/sdk'

dotenv.config()

const app = express()

app.use(express.json()) // to support JSON-encoded bodies
app.use(express.urlencoded()) // to support URL-encoded bodies

const apiKey = process.env.DIAGONAL_API_KEY as string

const diagonal = new Diagonal(apiKey)

app.post(
  '/expire-checkout-session/:id',
  async (req: Request, res: Response) => {
    const checkoutSessionId = req.params.id

    await diagonal.checkout.sessions.expire(checkoutSessionId)

    res.send(200)
  },
)

// start the express server
app.listen(3000, () => {
  console.log(`server started at http://localhost:3000`)
})

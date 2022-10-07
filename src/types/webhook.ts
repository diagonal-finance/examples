import { ChargeData, ChargeEventType } from './charge'
import { SubscriptionData, SubscriptionEventType } from './subscription'

export interface IWebhookEvent {
  id: string
  createdAt: Date
  type: ChargeEventType | SubscriptionEventType
  data: ChargeData | SubscriptionData
}

export interface ISignatureHeader {
  timestamp: string
  signature: string
}

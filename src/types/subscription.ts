import { ChainName, Token } from './blockchain'

export enum RecurringInterval {
  MONTH = 'month',
  YEAR = 'year',
}

export enum SubscriptionEventType {
  created = 'subscription.created',
  active = 'subscription.active',
  updated = 'subscription.updated',
  canceled = 'subscription.canceled',
  updateApplied = 'subscription.update_applied',
  updateFailed = 'subscription.update_failed',
}

export enum SubscriptionStatus {
  INCOMPLETE = 'incomplete',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  CANCELING = 'canceling',
  EXPIRED = 'expired',
}

export interface SubscriptionBalanceData {
  amount: string
  updated_at: number
}

export interface SubscriptionPaymentData {
  amount: string
  at: number
}

export interface SubscriptionBillingData {
  amount: string
  interval: RecurringInterval
  interval_count: number
}

export interface SubscriptionPaymentInformationData {
  address: string
  token: Token
  chain: ChainName
}

export interface SubscriptionData {
  id: string
  status: SubscriptionStatus
  customer_id?: string
  created_at: number
  past_due_since?: number
  canceled_at?: number
  balance: SubscriptionBalanceData
  next_payment: SubscriptionPaymentData
  last_payment?: SubscriptionPaymentData
  billing: SubscriptionBillingData
  payment_information: SubscriptionPaymentInformationData
}

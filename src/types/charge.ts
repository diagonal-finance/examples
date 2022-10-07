import { Token } from './blockchain'

export enum TransactionExecutionErrorMessage {
  INSUFFICIENT_ALLOWANCE = 'insufficient_allowance',
  INSUFFICIENT_BALANCE = 'insufficient_balance',
  CUSTOMER_BLACKLISTER = 'customer_blacklisted',
  CONTRACT_PAUSED = 'contract_paused',
  INVALID_OWNER_ADDRESS = 'invalid_owner_address',
  INVALID_PERMIT_SIGNATURE = 'invalid_permit_signature',
  EXPIRED_PERMIT = 'expired_permit',
  INVALID_NONCE = 'invalid_nonce',
  INVALID_CHARGE_SIGNATURE = 'invalid_charge_signature',
  NOT_DIAGONAL_BOT = 'not_diagonal_bot',
  UNKNOWN = 'unknown',
  TRANSACTION_NOT_EXISTS = 'transaction_not_exists',
  FINALIZATION_RETRY_LIMIT_REACHED = 'finalization_retry_limit_reached',
}

export enum ChargeEventType {
  created = 'charge.created',
  confirmed = 'charge.confirmed',
  finalised = 'charge.finalised',
  failed = 'charge.failed',
  signatureRequest = 'charge.signature_request',
}

export enum ChargeStatus {
  CREATED = 'created',
  REQUESTED = 'requested',
  SIGNED = 'signed',
  PROCESSING = 'processing',
  FAILED = 'failed',
  CONFIRMED = 'confirmed',
  FINALIZED = 'finalized',
}

export interface ChargeData {
  id: string
  status: ChargeStatus
  subscription_id: string
  customer_id?: string
  source_address: string
  amount: string
  token: Token
  transaction: string
  nonce: number
  requested_at?: number
  signed_at?: number
  processing_at?: number
  confirmed_at?: number
  finalized_at?: number
  failed_at?: number
  failure_reason?: TransactionExecutionErrorMessage
}

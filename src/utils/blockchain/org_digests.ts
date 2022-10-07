import { BigNumber, utils as ethersUtils } from 'ethers'

import {
  ChargeBatchStruct as ChargeBatch,
  ChargeStruct as Charge,
  WithdrawalStruct as Withdraw,
} from '../../typechain/DiagonalOrgV3'

export const computeEip712ChargeDigest = (
  charge: Charge,
  diagonalOrgAddr: string,
  chargeNonce: BigNumber,
  chainId: number,
): string => {
  const signaturePrefix = '\x19\x01'

  const domainSeparator = computeEip712DiagonalOrgDomainSeparator(
    diagonalOrgAddr,
    chainId,
  )
  const chargeStructHash = computeEip712ChargeStructHash(charge, chargeNonce)
  return ethersUtils.solidityKeccak256(
    ['string', 'bytes32', 'bytes32'],
    [signaturePrefix, domainSeparator, chargeStructHash],
  )
}

export const computeEip712WithdrawDigest = (
  withdraw: Withdraw,
  diagonalOrgAddr: string,
  nonce: BigNumber,
  chainId: number,
): string => {
  const signaturePrefix = '\x19\x01'

  const domainSeparator = computeEip712DiagonalOrgDomainSeparator(
    diagonalOrgAddr,
    chainId,
  )
  const withdrawStructHash = computeEip712WithdrawStructHash(withdraw, nonce)
  return ethersUtils.solidityKeccak256(
    ['string', 'bytes32', 'bytes32'],
    [signaturePrefix, domainSeparator, withdrawStructHash],
  )
}

export const computeEip712ChargeBatchDigest = (
  chargeBatch: ChargeBatch,
  diagonalOrgAddr: string,
  nonce: BigNumber,
  chainId: number,
): string => {
  const signaturePrefix = '\x19\x01'

  const domainSeparator = computeEip712DiagonalOrgDomainSeparator(
    diagonalOrgAddr,
    chainId,
  )
  const chargeBatchStructHash = computeEip712ChargeBatchStructHash(
    chargeBatch,
    nonce,
  )
  return ethersUtils.solidityKeccak256(
    ['string', 'bytes32', 'bytes32'],
    [signaturePrefix, domainSeparator, chargeBatchStructHash],
  )
}

const computeEip712DiagonalOrgDomainSeparator = (
  diagonalOrgAddr: string,
  chainId: number,
): string => {
  const hashedName = ethersUtils.id('DiagonalOrg')
  const hashedVersion = ethersUtils.id('1')
  const typeHash = ethersUtils.id(
    'EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)',
  )

  const domainSeparatorEncoded = ethersUtils.defaultAbiCoder.encode(
    ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
    [typeHash, hashedName, hashedVersion, chainId, diagonalOrgAddr],
  )

  return ethersUtils.keccak256(domainSeparatorEncoded)
}

const computeEip712ChargeStructHash = (
  charge: Charge,
  chargeNonce: BigNumber,
): string => {
  const chargeTypeHash = ethersUtils.id(
    'Charge(bytes32 id,address source,address token,uint256 amount,uint256 nonce)',
  )
  const structHashEncoded = ethersUtils.defaultAbiCoder.encode(
    ['bytes32', 'bytes32', 'address', 'address', 'uint256', 'uint256'],
    [
      chargeTypeHash,
      charge.id,
      charge.source,
      charge.token,
      charge.amount,
      chargeNonce,
    ],
  )

  return ethersUtils.keccak256(structHashEncoded)
}
const computeEip712ChargeBatchStructHash = (
  chargeBatch: ChargeBatch,
  nonce: BigNumber,
): string => {
  const chargeBatchTypeHash = ethersUtils.id(
    'Charge(bytes32 id,address[] sources,address[] tokens,uint256[] amounts,uint256 nonce)',
  )
  const structHashEncoded = ethersUtils.defaultAbiCoder.encode(
    ['bytes32', 'bytes32', 'address[]', 'address[]', 'uint256[]', 'uint256'],
    [
      chargeBatchTypeHash,
      chargeBatch.id,
      chargeBatch.sources,
      chargeBatch.tokens,
      chargeBatch.amounts,
      nonce,
    ],
  )

  return ethersUtils.keccak256(structHashEncoded)
}

const computeEip712WithdrawStructHash = (
  withdraw: Withdraw,
  nonce: BigNumber,
): string => {
  const withdrawTypeHash = ethersUtils.id(
    'Withdrawal(bytes32 id,address token,uint256 amount,uint256 fee,uint256 nonce)',
  )
  const structHashEncoded = ethersUtils.defaultAbiCoder.encode(
    ['bytes32', 'bytes32', 'address', 'uint256', 'uint256', 'uint256'],
    [
      withdrawTypeHash,
      withdraw.id,
      withdraw.token,
      withdraw.amount,
      withdraw.fee,
      nonce,
    ],
  )

  return ethersUtils.keccak256(structHashEncoded)
}

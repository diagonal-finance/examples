import { BigNumber, ethers } from 'ethers'

const BIGNUMBER_DECIMALS = 18

export function toBigNumber(
  value: string,
  decimals: number = BIGNUMBER_DECIMALS,
): BigNumber {
  return ethers.utils.parseUnits(value, decimals)
}

import { ChainId, Token } from './types/blockchain'

export const TOKEN_ADDRESSES: Record<Token, Record<ChainId, string | null>> = {
  [Token.dai]: {
    [ChainId.goerli]: '0x11fe4b6ae13d2a6055c8d9cf65c55bac32b5d844',
    [ChainId.ethereum]: '0x6b175474e89094c44da98b954eedeac495271d0f',
  },
  [Token.usdc]: {
    [ChainId.goerli]: '0x07865c6e87b9f70255377e024ace6630c1eaa37f',
    [ChainId.ethereum]: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  },
}

export const TOKEN_NAMES: Record<ChainId, Record<string, Token | null>> = {
  [ChainId.goerli]: {
    '0x11fe4b6ae13d2a6055c8d9cf65c55bac32b5d844': Token.dai,
    '0x07865c6e87b9f70255377e024ace6630c1eaa37f': Token.usdc,
  },
  [ChainId.ethereum]: {
    '0x6b175474e89094c44da98b954eedeac495271d0f': Token.dai,
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': Token.usdc,
  },
}

export const TOKEN_DECIMALS: Record<Token, Record<ChainId, number | null>> = {
  [Token.dai]: {
    [ChainId.goerli]: 18,
    [ChainId.ethereum]: 18,
  },
  [Token.usdc]: {
    [ChainId.goerli]: 6,
    [ChainId.ethereum]: 6,
  },
}

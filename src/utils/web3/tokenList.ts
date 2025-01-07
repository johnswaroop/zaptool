import { ChainIds } from "./chains";
import { ethereumTokenList } from "./ethTokenList";
import { optimismTokenList } from "./optimismTokenList";

export type Token = {
  name: string;
  address: string;
  symbol: string;
  decimals: number;
  chainId: number;
  logoURI: string;
};

export type Tokens = {
  [key: string]: Token;
};

export type ChainToTokensMapping = {
  [key in ChainIds]: Tokens;
};

export const chainTokensMapping: ChainToTokensMapping = {
  [ChainIds.Ethereum]: ethereumTokenList,
  [ChainIds.Optimism]: optimismTokenList,
  [ChainIds.Fantom]: {}, // TODO: add token list for FTM
};

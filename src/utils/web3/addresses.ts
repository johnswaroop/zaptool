import { ChainIds } from "./chains";

interface AddressMapping {
  ALCX?: string;
  GALCX?: string;
  ALUSD?: string;
  ALCHEMIST?: string;
  ALETH?: string;
  ALCHEMIST_ETH?: string;
  DAI?: string;
  USDC?: string;
  USDT?: string;
  FRAX?: string;
  WETH?: string;
  GATEWAY?: string;
}

interface ChainData {
  name: string;
  addresses: AddressMapping;
}

type AlchmixContractAddresses = {
  [key in ChainIds]: ChainData;
};

export const addresses: AlchmixContractAddresses = {
  [ChainIds.Ethereum]: {
    name: "Ethereum Mainnet",
    addresses: {
      ALCX: "0xdBdb4d16EdA451D0503b854CF79D55697F90c8DF",
      GALCX: "0x93dede06ae3b5590af1d4c111bc54c3f717e4b35",
      ALUSD: "0xBC6DA0FE9aD5f3b0d58160288917AA56653660E9",
      ALCHEMIST: "0x5C6374a2ac4EBC38DeA0Fc1F8716e5Ea1AdD94dd", // for mainnet alUSD // 0xf547b87Cd37607bDdAbAFd9bF1EA4587a0F4aCFb
      ALETH: "0x0100546F2cD4C9D97f798fFC9755E47865FF7Ee6",
      ALCHEMIST_ETH: "0x062Bf725dC4cDF947aa79Ca2aaCCD4F385b13b5c", // for mainnet alETH
      DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
      USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      FRAX: "0x853d955aCEf822Db058eb8505911ED77F175b99e",
      WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      GATEWAY: "0xA22a7ec2d82A471B1DAcC4B37345Cf428E76D67A",
    },
  },
  [ChainIds.Optimism]: {
    name: "Optimism Mainnet",
    addresses: {
      GALCX: "0x870d36B8AD33919Cc57FFE17Bb5D3b84F3aDee4f",
      ALUSD: "0xCB8FA9a76b8e203D8C3797bF438d8FB81Ea3326A",
      ALETH: "0x3E29D3A9316dAB217754d13b28646B76607c5f04",
      ALCHEMIST: "0x10294d57A419C8eb78C648372c5bAA27fD1484af", // for opti alUSD // 0x1Bce0aca8B0E4139e4390Cf1A7A6eb644000A2F0
      ALCHEMIST_ETH: "0xe04Bb5B4de60FA2fBa69a93adE13A8B3B569d5B4", // for opti alETH
      DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
      USDC: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607",
      USDT: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
      WETH: "0x4200000000000000000000000000000000000006",
      GATEWAY: "0xDB3fE4Da32c2A79654D98e5a41B22173a0AF3933",
    },
  },
  [ChainIds.Fantom]: {
    name: "Fantom Opera",
    addresses: {
      GALCX: "0x70F9fd19f857411b089977E7916c05A0fc477Ac9",
      ALUSD: "0xB67FA6deFCe4042070Eb1ae1511Dcd6dcc6a532E",
      ALCHEMIST: "0x76b2E3c5a183970AAAD2A48cF6Ae79E3e16D3A0E", // for fantom alUSD
      DAI: "0x8D11eC38a3EB5E956B052f67Da8Bdc9bef8Abf3E",
      USDC: "0x04068DA6C83AFCFA0e13ba15A6696662335D5B75",
      USDT: "0x049d68029688eAbF473097a2fC38ef61633A3C7A",
    },
  },
};

export const getAlchemistAddress = (chainId: ChainIds, symbol: string) =>
  addresses[chainId].addresses[
    `ALCHEMIST${symbol.includes("ETH") ? "_ETH" : ""}`
  ];

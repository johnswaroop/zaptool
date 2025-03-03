import { useEffect, useState } from "react";
import { BigNumber, Contract, constants, providers, utils } from "ethers";
import type { Web3Provider } from "@ethersproject/providers";
import { addresses, getAlchemistAddress } from "./addresses";
import { currencies, Currency } from "./currencies";
import { availableChains, ChainIds } from "./chains";
import alchemistAbi from "../abis/alchemist.json";
import gatewayAbi from "../abis/gateway.json";
import erc20Abi from "../abis/erc20.json";
import { chainTokensMapping, Token } from "./tokenList";
import { EnsoRouteResponse, fetchQoutesFromENSO } from "./enso";
import { ProviderController } from "web3modal";
import axios from "axios";
import { fetchTokenPriceInUSD } from "./coingecko";

export const useUnderlyingTokens = (
  chainId: ChainIds,
  provider: Web3Provider
) => {
  const [tokens, setTokens] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      const alchemistContractAddress =
        addresses[chainId].addresses["ALCHEMIST"];
      if (!alchemistContractAddress)
        throw new Error(
          `useUnderlyingTokens(ERROR): ALCHEMIST contract address not found for chainId: ${chainId}`
        );
      const alchemist = new Contract(
        alchemistContractAddress,
        alchemistAbi,
        provider
      );
      let data = await alchemist["getSupportedUnderlyingTokens"]();
      try {
        const alchemistETHContractAddress =
          addresses[chainId].addresses["ALCHEMIST_ETH"];
        if (!alchemistETHContractAddress)
          throw new Error(`ALCHEMIST_ETH contract address not found`);
        const alchemistETH = new Contract(
          alchemistETHContractAddress,
          alchemistAbi,
          provider
        );
        const dataETH = await alchemistETH["getSupportedUnderlyingTokens"]();
        data = [...dataETH, ...data];
      } catch (e) {
        console.warn(
          `Not supporting alchemist eth in ${availableChains[chainId].chainName}`
        );
      }
      setTokens(data);
    };

    if (provider) fetch();
  }, [chainId, provider]);

  return { tokens };
};

export type YeildTokensMapping = {
  [key: string]: string[];
};

export const useYieldTokens = (chainId: ChainIds, provider: Web3Provider) => {
  const [mapping, setMapping] = useState<YeildTokensMapping>({});

  useEffect(() => {
    const fetch = async () => {
      const finalData: YeildTokensMapping = {};
      const alchemistContractAddress =
        addresses[chainId].addresses["ALCHEMIST"];
      if (!alchemistContractAddress)
        throw new Error(`ALCHEMIST contract address not found`);
      const alchemist = new Contract(
        alchemistContractAddress,
        alchemistAbi,
        provider
      );
      const data: string[] = await alchemist["getSupportedYieldTokens"]();
      const params = await Promise.all(
        data.map((x: string) => alchemist["getYieldTokenParameters"](x))
      );
      for (let i = 0; i < params.length; i++) {
        if (Object.keys(finalData).includes(params[i][1].toLowerCase()))
          finalData[params[i][1].toLowerCase()].push(data[i].toLowerCase());
        else finalData[params[i][1].toLowerCase()] = [data[i].toLowerCase()];
      }
      try {
        const alchemistETHContractAddress =
          addresses[chainId].addresses["ALCHEMIST_ETH"];
        if (!alchemistETHContractAddress)
          throw new Error(`ALCHEMIST_ETH contract address not found`);
        const alchemistETH = new Contract(
          alchemistETHContractAddress,
          alchemistAbi,
          provider
        );
        const dataETH = await alchemistETH["getSupportedYieldTokens"]();
        const paramsETH = await Promise.all(
          dataETH.map((x: string) => alchemistETH["getYieldTokenParameters"](x))
        );
        for (let i = 0; i < paramsETH.length; i++) {
          if (Object.keys(finalData).includes(paramsETH[i][1].toLowerCase()))
            finalData[paramsETH[i][1].toLowerCase()].push(
              dataETH[i].toLowerCase()
            );
          else
            finalData[paramsETH[i][1].toLowerCase()] = [
              dataETH[i].toLowerCase(),
            ];
        }
      } catch (e) {
        console.warn(
          `Not supporting alchemist eth in ${availableChains[chainId].chainName}`
        );
      }
      console.log("finalData", finalData); // TODO: remove this
      setMapping(finalData);
    };

    if (provider) fetch();
  }, [chainId, provider]);

  return { mapping };
};

export const useAlchemixPosition = (
  depositAsset: string,
  mapping: YeildTokensMapping,
  yieldTokenIndex: number,
  address: string,
  chainId: ChainIds,
  provider: Web3Provider,
  isPending: boolean
) => {
  const [position, setPosition] = useState({ balance: 0, weight: 0 });

  useEffect(() => {
    const fetch = async () => {
      try {
        const yieldToken =
          mapping[
            currencies[
              depositAsset === "ETH" ? "WETH" : depositAsset
            ].addresses[chainId].toLowerCase()
          ][yieldTokenIndex];
        const alchemistAddress = getAlchemistAddress(chainId, depositAsset);
        if (!alchemistAddress)
          throw new Error(
            `useAlchemixPosition(ERROR): Alchemist address for ChainId: ${chainId} and Deposit Asset: ${depositAsset} not found`
          );
        const alchemist = new Contract(
          alchemistAddress,
          alchemistAbi,
          provider
        );
        const data = await alchemist["positions"](address, yieldToken);
        setPosition({
          balance: +utils.formatEther(data.shares),
          weight: +utils.formatEther(data.lastAccruedWeight),
        });
      } catch (e) {
        console.warn(`Error fetching yield tokens, ${e}`);
      }
    };

    if (
      chainId > 0 &&
      address.length > 0 &&
      depositAsset.length > 0 &&
      !!provider &&
      yieldTokenIndex > -1
    )
      fetch();
  }, [
    address,
    chainId,
    depositAsset,
    mapping,
    provider,
    yieldTokenIndex,
    isPending,
  ]);

  return { ...position };
};

export const getTokenAllowance = async (
  depositTokenAddress: string,
  signerAddress: string,
  alchemixAddress: string,
  provider: Web3Provider
) => {
  // Calculate allowance for deposit token
  const tokenContract = new Contract(depositTokenAddress, erc20Abi, provider);
  const allowance = await tokenContract.allowance(
    signerAddress,
    alchemixAddress
  );
  return allowance;
};

export const useTokenInfo = (
  symbol: string,
  address: string,
  chainId: ChainIds,
  provider: Web3Provider,
  isPending: boolean
) => {
  const [balance, setBalance] = useState(BigNumber.from(0));
  const [allowance, setAllowance] = useState(BigNumber.from(0));

  useEffect(() => {
    const fetch = async () => {
      try {
        if (symbol === "ETH") {
          setBalance(await provider.getBalance(address));
          setAllowance(constants.MaxUint256);
          return;
        }
        const token = new Contract(
          currencies[symbol].addresses[chainId],
          erc20Abi,
          provider
        );
        setBalance(await token["balanceOf"](address));
        setAllowance(
          await token["allowance"](
            address,
            getAlchemistAddress(chainId, symbol)
          )
        );
      } catch (e) {
        console.warn(`Error fetching token info, ${e} ${symbol}`);
      }
    };

    if (symbol.length > 0 && address.length > 0 && !!provider) fetch();
  }, [address, chainId, provider, symbol, isPending]);

  return { balance, allowance };
};

export const useSelectedTokenInfo = (
  symbol: string,
  address: string,
  chainId: ChainIds,
  provider: Web3Provider,
  isPending: boolean,
  ensoResponse: EnsoRouteResponse | null
): { balance: BigNumber; allowance: BigNumber } => {
  const [balance, setBalance] = useState(BigNumber.from(0));
  const [allowance, setAllowance] = useState(BigNumber.from(0));

  useEffect(() => {
    const fetch = async () => {
      try {
        if (symbol === "ETH") {
          setBalance(await provider.getBalance(address));
          setAllowance(constants.MaxUint256);
          return;
        }
        const token = new Contract(
          symbol in currencies
            ? currencies[symbol].addresses[chainId]
            : chainTokensMapping[chainId][symbol].address,
          erc20Abi,
          provider
        );
        setBalance(await token["balanceOf"](address));

        const allowToAddress = ensoResponse?.tx.to;
        if (!allowToAddress) {
          setAllowance(BigNumber.from(0));
        } else {
          setAllowance(await token["allowance"](address, allowToAddress));
        }
      } catch (e) {
        console.warn(`Error fetching token info, ${e}`);
      }
    };

    if (symbol.length > 0 && address.length > 0 && !!provider) fetch();
  }, [address, chainId, provider, symbol, isPending, ensoResponse]);

  return { balance, allowance };
};

export const useMaximumMintableAmount = (
  depositAsset: string,
  depositAmount: string,
  address: string,
  chainId: ChainIds,
  provider: Web3Provider
) => {
  const [maximumAmount, setMaximumAmount] = useState(BigNumber.from(0));

  useEffect(() => {
    const fetch = async () => {
      try {
        const alchemistAddress = getAlchemistAddress(chainId, depositAsset);
        if (!alchemistAddress)
          throw new Error(
            `useMaximumMintableAmount(ERROR): Alchemist address for ChainId: ${chainId} and Deposit Asset: ${depositAsset} not found`
          );
        const alchemist = new Contract(
          alchemistAddress,
          alchemistAbi,
          provider
        );
        const minimumCollateralization = await alchemist[
          "minimumCollateralization"
        ]();
        const account = await alchemist["accounts"](address);
        const yieldTokenParameters = await Promise.all(
          account.depositedTokens.map((x: any) =>
            alchemist["getYieldTokenParameters"](x)
          )
        );
        const positions = await Promise.all(
          account.depositedTokens.map((x: any) =>
            alchemist["positions"](address, x)
          )
        );
        let userTotalDeposit = utils.parseUnits(
          Number(depositAmount).toString(),
          currencies[depositAsset]?.decimals || 18
        );
        yieldTokenParameters.forEach((param, index) => {
          userTotalDeposit = userTotalDeposit.add(
            param.activeBalance
              .sub(param.harvestableBalance)
              .mul(positions[index].shares)
              .div(param.totalShares)
          );
        });
        setMaximumAmount(
          userTotalDeposit
            .mul(utils.parseEther("1"))
            .div(minimumCollateralization)
            .sub(account.debt)
        );
      } catch (e) {
        console.warn(`Error fetching maximum mintable amount, ${e}`);
      }
    };

    if (address.length > 0 && depositAsset.length > 0 && !!provider) fetch();
  }, [address, chainId, depositAmount, depositAsset, provider]);

  return { maximumAmount };
};

export const getTokenSymbol = async (
  address: string,
  provider: Web3Provider
): Promise<string> => {
  const token = new Contract(address, erc20Abi, provider);
  return await token["symbol"]();
};

export const getTokenNameAndSymbol = async (
  address: string,
  provider: Web3Provider
) => {
  const token = new Contract(address, erc20Abi, provider);
  return `${await token["name"]()} (${await token["symbol"]()})`;
};

export const approveTokenToEnso = async (
  symbol: string,
  amount: BigNumber,
  address: string,
  provider: Web3Provider,
  ensoResponse: EnsoRouteResponse
) => {
  const signer = provider.getSigner();
  const providerChainId = provider.network.chainId;
  if (!(providerChainId in ChainIds))
    throw new Error(
      `approveToken(ERROR): chainId ${provider.network.chainId} is not supported`
    );
  const chainId: ChainIds = providerChainId;

  const allowToAddress = ensoResponse.tx.to;
  const tokenAddress =
    symbol in currencies
      ? currencies[symbol].addresses[chainId]
      : chainTokensMapping[chainId][symbol].address;
  const token = new Contract(tokenAddress, erc20Abi, signer);

  if (symbol === "USDT") {
    const allowance = await token["allowance"](address, allowToAddress);
    if (!allowance.isZero()) {
      const tx = await token["approve"](allowToAddress, BigNumber.from(0));
      await tx.wait();
    }
  }

  return token["approve"](allowToAddress, amount);
};

export const approveTokenToAlchemixContract = async (
  depositAsset: string,
  amount: BigNumber,
  address: string,
  provider: Web3Provider
) => {
  const signer = provider.getSigner();
  const providerChainId = provider.network.chainId;
  if (!(providerChainId in ChainIds))
    throw new Error(
      `approveToken(ERROR): chainId ${provider.network.chainId} is not supported`
    );
  const chainId: ChainIds = providerChainId;

  const alchemistAddress = getAlchemistAddress(chainId, depositAsset);
  if (!alchemistAddress)
    throw new Error(
      `approveToken(ERROR): Alchemist Address not found for chainId: ${chainId} depositAsset: ${depositAsset}`
    );

  const tokenAddress = currencies[depositAsset].addresses[chainId];
  const token = new Contract(tokenAddress, erc20Abi, signer);

  return token["approve"](alchemistAddress, amount);
};

export const getBestCurrencyForDeposit = (
  chainId: ChainIds,
  inputToken: string,
  inputTokenAmount: BigNumber,
  provider: Web3Provider
): Currency => {
  // try {
  //   // Mapping to store the amount of each output token
  //   const currencyOutputMapping: Record<string, BigNumber> = {};

  //   // Fetch quotes for each currency and populate currencyOutputMapping
  //   const promises = Object.keys(currencies).map((key) =>
  //     new Promise<void>(async (resolve, reject) => {
  //       try {
  //         const currency = currencies[key];
  //         const outputTokenAddress = currency.addresses[chainId];
  //         const fromAddress = await provider.getSigner().getAddress();
  //         const quote = await fetchQoutesFromENSO(
  //           chainId,
  //           fromAddress,
  //           inputToken,
  //           outputTokenAddress,
  //           inputTokenAmount
  //         );
  //         currencyOutputMapping[key] = BigNumber.from(quote.amountOut);
  //         resolve();
  //       } catch (error) {
  //         reject(`Error fetching quote for currency ${key}: ${error}`);
  //       }
  //     })
  //   );

  //   // Wait for all promises to resolve
  //   await Promise.all(promises);

  //   // Mapping to store the USD value of each output token
  //   const currencyOutputToUSDMapping: Record<string, BigNumber> = {};

  //   // Fetch USD value for each output token
  //   const usdPromises = Object.keys(currencyOutputMapping).map((key) =>
  //     new Promise<void>(async (resolve, reject) => {
  //       try {
  //         const outputTokenAmount = currencyOutputMapping[key];
  //         const outputTokenAddress = currencies[key].addresses[chainId];

  //         // Call an API or function to get the USD value
  //         const usdValue = await fetchTokenPriceInUSD(outputTokenAddress, outputTokenAmount);
  //         currencyOutputToUSDMapping[key] = usdValue;
  //         resolve();
  //       } catch (error) {
  //         reject(`Error fetching USD value for currency ${key}: ${error}`);
  //       }
  //     })
  //   );

  //   // Wait for all USD fetch promises to resolve
  //   await Promise.all(usdPromises);

  //   // Return both mappings
  //   return {
  //     currencyOutputMapping,
  //     currencyOutputToUSDMapping,
  //   };

  // } catch (error) {
  //   throw new Error(
  //     `getBestTokenForDeposit(ERROR): error fetching best token for deposit, ${error}`
  //   );
  // }

  return currencies["USDC"];
};

export const getBestCurrencyForLoan = (
  chainId: ChainIds,
  outputToken: string,
  outputTokenAmount: BigNumber,
  provider: Web3Provider
): Currency => {
  return currencies["USDT"];
};

export const depositUnderlying = (
  depositAsset: string,
  yieldToken: string,
  amount: BigNumber,
  address: string,
  provider: Web3Provider
) => {
  const providerChainId = provider.network.chainId;
  if (!(providerChainId in ChainIds))
    throw new Error(
      `depositUnderlying(ERROR): chainId ${provider.network.chainId} is not supported`
    );

  const chainId: ChainIds = providerChainId;

  if (depositAsset === "ETH") {
    const gatewayAddress = addresses[chainId].addresses["GATEWAY"];
    if (!gatewayAddress)
      throw new Error(
        `depositUnderlying(ERROR): gateway address not found for chainId ${chainId}`
      );

    const wethGateway = new Contract(
      gatewayAddress,
      gatewayAbi,
      provider.getSigner()
    );

    const alchemistAddress = getAlchemistAddress(chainId, depositAsset);
    if (!alchemistAddress)
      throw new Error(
        `depositUnderlying(ERROR): Alchemist Address not found for chainId: ${chainId} depositAsset: ${depositAsset}`
      );

    return wethGateway["depositUnderlying"](
      alchemistAddress,
      yieldToken,
      amount,
      address,
      0,
      { value: amount }
    );
  }

  const alchemistAddress = getAlchemistAddress(chainId, depositAsset);
  if (!alchemistAddress)
    throw new Error(
      `depositUnderlying(ERROR): Alchemist Address not found for chainId: ${chainId} depositAsset: ${depositAsset}`
    );
  const alchemist = new Contract(
    alchemistAddress,
    alchemistAbi,
    provider.getSigner()
  );
  return alchemist["depositUnderlying"](yieldToken, amount, address, 0);
};

export const depositAndBorrow = (
  depositAsset: string,
  yieldToken: string,
  depositAmount: BigNumber,
  borrowAmount: BigNumber,
  address: string,
  provider: Web3Provider
) => {
  const providerChainId = provider.network.chainId;
  if (!(providerChainId in ChainIds))
    throw new Error(
      `depositAndBorrow(ERROR): chainId ${provider.network.chainId} is not supported`
    );

  const chainId: ChainIds = providerChainId;

  const alchemistAddress = getAlchemistAddress(chainId, depositAsset);
  if (!alchemistAddress)
    throw new Error(
      `depositAndBorrow(ERROR): Alchemist Address not found for chainId: ${chainId} depositAsset: ${depositAsset}`
    );

  const alchemist = new Contract(
    alchemistAddress,
    alchemistAbi,
    provider.getSigner()
  );

  const iface = new utils.Interface(alchemistAbi);
  const calls = [];
  calls.push(
    iface.encodeFunctionData("depositUnderlying", [
      yieldToken,
      depositAmount,
      address,
      0,
    ])
  );
  calls.push(iface.encodeFunctionData("mint", [borrowAmount, address]));

  return alchemist["multicall"](calls);
};

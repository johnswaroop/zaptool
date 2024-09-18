import { useEffect, useState } from "react";
import { BigNumber, Contract, constants, utils } from "ethers";
import type { Web3Provider } from "@ethersproject/providers";
import { addresses, getAlchemistAddress } from "./addresses";
import { currencies } from "./currencies";
import { availableChains, ChainIds } from "./chains";
import alchemistAbi from "../abis/alchemist.json";
import gatewayAbi from "../abis/gateway.json";
import erc20Abi from "../abis/erc20.json";

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
        console.warn(`Error fetching token info, ${e}`);
      }
    };

    if (symbol.length > 0 && address.length > 0 && !!provider) fetch();
  }, [address, chainId, provider, symbol, isPending]);

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

export const approveToken = async (
  symbol: string,
  amount: BigNumber,
  address: string,
  provider: Web3Provider
) => {
  const alchemist = getAlchemistAddress(provider.network.chainId, symbol);
  const signer = provider.getSigner();
  const providerChainId = provider.network.chainId;
  if (!(providerChainId in ChainIds))
    throw new Error(
      `approveToken(ERROR): chainId ${provider.network.chainId} is not supported`
    );

  const chainId: ChainIds = providerChainId;
  const tokenAddress = currencies[symbol].addresses[chainId];
  const token = new Contract(tokenAddress, erc20Abi, signer);
  if (symbol === "USDT") {
    const allowance = await token["allowance"](address, alchemist);
    if (!allowance.isZero()) {
      const tx = await token["approve"](alchemist, BigNumber.from(0));
      await tx.wait();
    }
  }
  return token["approve"](alchemist, amount);
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

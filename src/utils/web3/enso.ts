import { config } from "@/config";
import axios from "axios";
import { ChainIds } from "./chains";
import { BigNumber } from "ethers";

export const fetchQoutesFromENSO = async (
  chainId: ChainIds,
  fromAddress: string,
  tokenInAddress: string,
  tokenOutAddress: string,
  amountIn: BigNumber
): Promise<{ gas: string; amountOut: string; priceImpact: string }> => {
  const params = new URLSearchParams({
    chainId: chainId.toString(),
    fromAddress: fromAddress,
    tokenIn: tokenInAddress,
    tokenOut: tokenOutAddress,
    amountIn: amountIn.toString(),
  });

  const response = await axios.get(
    `${config.ENSO_URL}/api/v1/shortcuts/quotes`,
    {
      params,
    }
  );

  const data = response.data as {
    gas: string;
    amountOut: string;
    priceImpact: string;
  };

  return data;
};

export const fetchTokenPriceInUSD = async (
  chainId: ChainIds,
  tokenAddress: string,
  tokenAmount: BigNumber
): Promise<{
  decimals: Number;
  price: Number;
  timestamp: Number;
}> => {
  const response = await axios.get(
    `${config.ENSO_URL}/api/v1/prices/${chainId}/${tokenAddress}`,
    {
      params: {
        amount: tokenAmount.toString(),
      },
    }
  );

  const data = response.data as {
    decimals: Number;
    price: Number;
    timestamp: Number;
  };

  return data;
};

export interface EnsoRouteResponse {
  gas: string;
  amountOut: string;
  priceImpact: Number;
  feeAmount: [string];
  createdAt: Number;
  tx: {
    data: string;
    to: string;
    from: string;
    value: string;
  };
  route: [
    {
      tokenIn: [string];
      tokenOut: [string];
      protocol: string;
      action: string;
      primary: string;
      internalRoutes: [string];
    }
  ];
}

export const fetchRouteForSwap = async (
  chainId: ChainIds,
  fromAddress: string,
  amountIn: BigNumber,
  tokenInAddress: string,
  tokenOutAddress: string
): Promise<EnsoRouteResponse> => {
  const params = new URLSearchParams({
    chainId: chainId.toString(),
    fromAddress: fromAddress,
    routingStrategy: "router",
    toEoa: "false",
    receiver: fromAddress,
    spender: fromAddress,
    amountIn: amountIn.toString(),
    slippage: "300",
    disableRFQs: "false",
    tokenIn: tokenInAddress,
    tokenOut: tokenOutAddress,
  });

  const response = await axios.get(
    `${config.ENSO_URL}/api/v1/shortcuts/route`,
    { params, headers: { Authorization: `Bearer ${config.ENSO_API_KEY}` } }
  );

  const data = response.data as EnsoRouteResponse;

  return data;
};

export interface EnsoTokenPriceResponse {
  decimals: number;
  price: number;
  address: string;
  symbol: string;
  timestamp: number;
  chainId: number;
}

export const getTokenPriceInUSD = async (
  chainId: ChainIds,
  address: string
): Promise<number> => {
  const response = await axios.get(
    `${config.ENSO_URL}/api/v1/prices/${chainId.toString()}/${address}`,
    { headers: { Authorization: `Bearer ${config.ENSO_API_KEY}` } }
  );

  const data = response.data as EnsoTokenPriceResponse;
  return data.price;
};

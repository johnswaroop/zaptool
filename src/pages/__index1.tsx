"use client";
import Image from "next/image";
import { Inter } from "next/font/google";
import Nav from "@/local/Nav";
import { BiSolidWalletAlt } from "react-icons/bi";
import { Button } from "@/components/ui/button";
const inter = Inter({ subsets: ["latin"] });
import TokenSelector from "@/local/TokenSelector";
import StrategySelector from "@/local/StrategySelector";
import { BigNumber, utils } from "ethers";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useWeb3Context,
  useUnderlyingTokens,
  useYieldTokens,
  useAlchemixPosition,
  useTokenInfo,
  useMaximumMintableAmount,
  currencies,
  getTokenSymbol,
  ChainIds,
  getTokenNameAndSymbol,
  approveToken,
  depositUnderlying,
  depositAndBorrow,
  useSelectedTokenInfo,
  getBestCurrencyForDeposit,
  getTokenAllowance,
  getAlchemistAddress,
} from "@/utils";
import type { Web3Provider } from "@ethersproject/providers";
import { LoaderCircle } from "lucide-react";
import SelectedTokenSelector from "@/local/SelectedTokenSelector";
import { chainTokensMapping, Token, Tokens } from "@/utils/web3/tokenList";
import { fetchRouteForSwap } from "@/utils/web3/enso";

export default function Home() {
  const { address, chainId, connected, connect, provider } =
    useWeb3Context() as {
      address: string;
      chainId: ChainIds;
      connected: boolean;
      connect: any;
      provider: Web3Provider;
    };
  const { tokens } = useUnderlyingTokens(chainId, provider);
  const { mapping } = useYieldTokens(chainId, provider);

  const [isPending, setPending] = useState(false);
  const [underlyingTokens, setUnderlyingTokens] = useState<string[]>([]);
  const [selectedInputToken, setSelectedInputToken] = useState<string>("");
  const [selectedInputTokenAmount, setSelectedInputTokenAmount] =
    useState<string>("");
  const [selectedOutputToken, setSelectedOutputToken] = useState<string>("");
  const [selectedOutputTokenAmount, setSelectedOutputTokenAmount] =
    useState<string>("");
  const [depositAsset, setDepositAsset] = useState<string>("");
  const [depositAmount, setDepositAmount] = useState<string>("");
  const [yieldTokens, setYieldTokens] = useState<string[]>([]);
  const [yieldToken, setYieldToken] = useState(-1);
  const [showLoans, setShowLoans] = useState(true);
  const [loanAssets, setLoanAssets] = useState<string[]>([]);
  const [loanAsset, setLoanAsset] = useState("");
  const [loanAmount, setLoanAmount] = useState("");

  const { balance: positionBalance } = useAlchemixPosition(
    depositAsset,
    mapping,
    yieldToken,
    address,
    chainId,
    provider,
    isPending
  );
  const { balance: depositBalance, allowance: depositAllowance } = useTokenInfo(
    depositAsset,
    address,
    chainId,
    provider,
    isPending
  );
  const { balance: inputTokenBalance, allowance: inputTokenAllowance } =
    useSelectedTokenInfo(
      selectedInputToken,
      address,
      chainId,
      provider,
      isPending
    );
  const { maximumAmount } = useMaximumMintableAmount(
    depositAsset,
    depositAmount,
    address,
    chainId,
    provider
  );

  const depositDecimals = useMemo(() => {
    return (
      currencies[depositAsset === "ETH" ? "WETH" : depositAsset]?.decimals || 18
    );
  }, [depositAsset]);

  const inputTokenDecimals = useMemo(() => {
    return selectedInputToken in currencies
      ? currencies[selectedInputToken === "ETH" ? "WETH" : selectedInputToken]
          ?.decimals || 18
      : chainTokensMapping[chainId][selectedInputToken]?.decimals || 18;
  }, [selectedInputToken]);

  const depositBalanceInsufficient = useMemo(
    () => +depositAmount > +utils.formatUnits(depositBalance, depositDecimals),
    [depositAmount, depositBalance, depositDecimals]
  );

  const inputTokenBalanceInsufficient = useMemo(
    () =>
      +selectedInputTokenAmount >
      +utils.formatUnits(inputTokenBalance, inputTokenDecimals),
    [selectedInputTokenAmount, inputTokenBalance, inputTokenDecimals]
  );

  const depositAllowanceInsufficient = useMemo(
    () =>
      +depositAmount > +utils.formatUnits(depositAllowance, depositDecimals),
    [depositAllowance, depositAmount, depositDecimals]
  );

  const inputTokenAllowanceInsufficient = useMemo(
    () =>
      +selectedInputTokenAmount >
      +utils.formatUnits(inputTokenAllowance, inputTokenDecimals),
    [selectedInputTokenAmount, inputTokenBalance, inputTokenDecimals]
  );

  const loanDecimals = useMemo(() => {
    return currencies[loanAsset]?.decimals || 18;
  }, [loanAsset]);

  const outputTokenDecimals = useMemo(() => {
    return selectedOutputToken in currencies
      ? currencies[selectedOutputToken]?.decimals || 18
      : chainTokensMapping[chainId][selectedOutputToken]?.decimals || 18;
  }, [loanAsset]);

  const loanAmountExceedsLimit = useMemo(
    () => +loanAmount > +utils.formatUnits(maximumAmount, depositDecimals),
    [depositDecimals, loanAmount, maximumAmount]
  );

  useEffect(() => {
    setUnderlyingTokens([]);
    setDepositAsset("");
    setYieldTokens([]);
    setYieldToken(-1);
    setLoanAssets([]);
    setLoanAsset("");
  }, [chainId, provider]);

  useEffect(() => {
    const fetch = async () => {
      try {
        const symbols = await Promise.all(
          tokens.map((x) => getTokenSymbol(x, provider))
        );
        if (chainId !== ChainIds.Fantom) symbols.splice(0, 0, "ETH");
        setUnderlyingTokens(symbols);
      } catch (e) {
        console.error(`Error fetching underlying token symbols, ${e}`);
      }
    };

    if (tokens.length > 0) fetch();
    else setDepositAsset("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokens]);

  useEffect(() => setShowLoans(depositAsset !== "ETH"), [depositAsset]);

  const fetchYieldTokens = useCallback(async () => {
    try {
      const tokens = await Promise.all(
        (
          mapping[
            currencies[
              depositAsset === "ETH" ? "WETH" : depositAsset
            ].addresses[chainId].toLowerCase()
          ] || []
        ).map((x) => getTokenNameAndSymbol(x, provider))
      );
      setYieldTokens(tokens);
      if (tokens.length > 0) setYieldToken(0);
      console.log("tokens:", tokens); // TODO: remove this
    } catch (e) {
      console.error(`Error fetching yield token symbols, ${e}`);
    }
  }, [chainId, depositAsset, mapping, provider]);

  useEffect(() => {
    fetchYieldTokens();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapping]);

  useEffect(() => {
    setYieldTokens([]);
    setYieldToken(-1);
    setLoanAssets([]);
    setLoanAsset("");
    fetchYieldTokens();
    if (depositAsset.length > 0) {
      const assets = [];
      // TODO: allow for next version
      if (process.env.SUPPORT_ALSWAP) assets.push(depositAsset);
      if (chainId !== ChainIds.Fantom || !depositAsset.includes("ETH"))
        assets.push(`AL${depositAsset.includes("ETH") ? "ETH" : "USD"}`);
      setLoanAssets(assets);
      if (assets.length > 0) setLoanAsset(assets[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depositAsset]);

  useEffect(() => {
    const amountStr = getAmountForDecimals(depositAmount, depositAsset);

    setDepositAmount(amountStr ?? "");
  }, [depositAsset]);

  useEffect(() => {
    const amountStr = getTokenAmountForDecimals(
      selectedInputTokenAmount,
      selectedInputToken,
      chainId
    );
    setSelectedInputTokenAmount(amountStr ?? "");
  }, [selectedInputToken]);

  useEffect(() => {
    if (depositAsset.length > 0)
      setLoanAmount(utils.formatUnits(maximumAmount, depositDecimals));
  }, [depositAmount, depositAsset, maximumAmount]);

  const shouldDisable = useMemo(
    () =>
      isPending ||
      (connected &&
        (depositAsset.length === 0 ||
          Number(depositAmount) === 0 ||
          depositBalanceInsufficient ||
          (!depositAllowanceInsufficient &&
            (yieldToken === -1 ||
              (showLoans &&
                (Number(loanAmount) === 0 ||
                  loanAmountExceedsLimit ||
                  loanAsset.length === 0)))))),
    [
      connected,
      depositAllowanceInsufficient,
      depositAmount,
      depositAsset,
      depositBalanceInsufficient,
      isPending,
      loanAmount,
      loanAmountExceedsLimit,
      loanAsset,
      showLoans,
      yieldToken,
    ]
  );

  const getAmountForDecimals = (amount: string, asset: string) => {
    if (amount == "" || amount == "0") {
      amount = "0";
    }
    if (+amount >= 1000000000) return;

    let decimals = 18;
    try {
      decimals = currencies[asset].decimals;
    } catch (_) {
      console.warn("Deposit asset not selected yet");
    }

    const [integerPart, decimalPart] = amount.split(".");
    return decimals && decimalPart?.length && decimalPart?.length > decimals
      ? integerPart.trim() + "." + decimalPart.trim().substring(0, decimals)
      : amount.trim();
  };

  const getTokenAmountForDecimals = (
    amount: string,
    asset: string,
    chainId: ChainIds
  ) => {
    if (amount == "" || amount == "0") {
      amount = "0";
    }
    if (+amount >= 1000000000) return;

    let decimals = 18;
    try {
      decimals =
        asset in currencies
          ? currencies[asset].decimals
          : chainTokensMapping[chainId][asset].decimals;
    } catch (_) {
      console.warn("Input token not selected yet");
    }

    const [integerPart, decimalPart] = amount.split(".");
    return decimals && decimalPart?.length && decimalPart?.length > decimals
      ? integerPart.trim() + "." + decimalPart.trim().substring(0, decimals)
      : amount.trim();
  };

  const handleAmountChange = (amount: string, index: number) => {
    const amountStr = getAmountForDecimals(
      amount,
      [depositAsset, loanAsset][index]
    );
    if (!amountStr)
      throw new Error(
        `handleAmountChange(ERROR): unable to getAmountForDecimals amount: ${amount} idx: ${index}`
      );
    if (!isNaN(Number(amountStr)) && !amountStr.includes("e"))
      [setDepositAmount, setLoanAmount][index](amountStr);
  };

  const handleTokenAmountChange = (amount: string, index: number) => {
    const amountStr = getTokenAmountForDecimals(
      amount,
      [selectedInputToken, selectedOutputToken][index],
      chainId
    );
    if (!amountStr)
      throw new Error(
        `handleTokenAmountChange(ERROR): unable to getTokenAmountForDecimals amount: ${amount} idx: ${index}`
      );
    if (!isNaN(Number(amountStr)) && !amountStr.includes("e"))
      [setSelectedInputTokenAmount, setSelectedOutputTokenAmount][index](
        amountStr
      );
  };

  const setMaxDeposit = () =>
    setDepositAmount(utils.formatUnits(depositBalance, depositDecimals));

  const setHalfDeposit = () =>
    setDepositAmount(utils.formatUnits(depositBalance.div(2), depositDecimals));

  const setMaxBorrow = () =>
    setLoanAmount(utils.formatUnits(maximumAmount, depositDecimals));

  const setHalfBorrow = () =>
    setLoanAmount(utils.formatUnits(maximumAmount.div(2), depositDecimals));

  const handleDeposit = async () => {
    if (!connected) {
      connect(chainId);
      return;
    }

    const amount = utils.parseUnits(depositAmount, depositDecimals);
    if (depositAllowanceInsufficient) {
      try {
        setPending(true);
        const tx = await approveToken(depositAsset, amount, address, provider);
        await tx.wait();
      } catch (e) {
        console.error(`Approve failure, ${e}`);
      } finally {
        setPending(false);
        return;
      }
    }

    try {
      setPending(true);

      let tx;

      const depositAssetKey = depositAsset === "ETH" ? "WETH" : depositAsset;
      if (!showLoans)
        tx = await depositUnderlying(
          depositAsset,
          mapping[currencies[depositAssetKey].addresses[chainId].toLowerCase()][
            yieldToken
          ],
          amount,
          address,
          provider
        );
      else
        tx = await depositAndBorrow(
          depositAsset,
          mapping[currencies[depositAssetKey].addresses[chainId].toLowerCase()][
            yieldToken
          ],
          amount,
          utils.parseUnits(loanAmount, loanDecimals),
          address,
          provider
        );
      await tx.wait();
    } catch (e) {
      console.error(`Deposit failure: ${e}`);
    } finally {
      setPending(false);
    }
  };

  const handleTokenDeposit = async () => {
    if (!connected) {
      connect(chainId);
      return;
    }

    const signer = provider.getSigner();

    let inputAmount = utils.parseUnits(
      selectedInputTokenAmount,
      inputTokenDecimals
    );

    let depositToken = selectedInputToken;
    let depositTokenAmount = inputAmount;

    // check if depositToken is part ALCX supported tokens, if not we have to swap it to ALCX supported token
    const isALCXSupportedToken = depositToken in currencies;
    if (!isALCXSupportedToken) {
      // find best currency to swap with
      const currency = await getBestCurrencyForDeposit(
        chainId,
        depositToken,
        depositTokenAmount,
        provider
      );

      // swap the token
      // for swapping we make use of enso api to get tx data
      const ensoRouteResponse = await fetchRouteForSwap(
        chainId,
        address,
        depositTokenAmount,
        chainTokensMapping[chainId][depositToken].address,
        currency.addresses[chainId]
      );

      // execute the tx
      const txResponse = await signer.sendTransaction(ensoRouteResponse.tx);

      console.log("Transaction sent! Waiting for confirmation...");
      console.log("Transaction Hash:", txResponse.hash);

      // Wait for transaction confirmation
      const receipt = await txResponse.wait();
      console.log("Transaction confirmed:", receipt);

      depositToken = currency.symbol;
      depositTokenAmount = BigNumber.from(ensoRouteResponse.amountOut);
    }

    let depositTokenAddress =
      depositToken in currencies
        ? currencies[depositToken].addresses[chainId]
        : chainTokensMapping[chainId][depositToken].address;

    // use the swapped token to deposit into alchemix
    const alchemistAddress = getAlchemistAddress(chainId, depositToken);
    if (!alchemistAddress) {
      throw new Error(`Alchemist address not found for chainId: ${chainId}`);
    }

    const allowance = await getTokenAllowance(
      depositTokenAddress,
      address,
      alchemistAddress,
      provider
    );
    const depositTokenAllowanceInsufficient = depositTokenAmount.gt(allowance);

    if (depositTokenAllowanceInsufficient) {
      try {
        setPending(true);
        const tx = await approveToken(
          depositToken,
          depositTokenAmount,
          address,
          provider
        );
        await tx.wait();
      } catch (e) {
        console.error(`Approve failure, ${e}`);
      } finally {
        setPending(false);
        return;
      }
    }

    try {
      setPending(true);

      let tx;

      // TODO: almost complete with flow of depositing token
      // now to work on borrow and loans
      const depositTokenKey = depositToken === "ETH" ? "WETH" : depositToken;
      if (!showLoans)
        tx = await depositUnderlying(
          depositAsset,
          mapping[currencies[depositTokenKey].addresses[chainId].toLowerCase()][
            yieldToken
          ],
          depositTokenAmount,
          address,
          provider
        );
      else
        tx = await depositAndBorrow(
          depositAsset,
          mapping[currencies[depositTokenKey].addresses[chainId].toLowerCase()][
            yieldToken
          ],
          depositTokenAmount,
          utils.parseUnits(loanAmount, loanDecimals),
          address,
          provider
        );
      await tx.wait();
    } catch (e) {
      console.error(`Deposit failure: ${e}`);
    } finally {
      setPending(false);
    }

    // try {
    //   setPending(true);

    //   if selectedOutputToken == loan

    // } catch (e) {
    //   console.error(`Output swap failure: ${e}`);
    // } finally {
    //   setPending(false);
    // }
  };

  return (
    <main
      style={{
        background: "url('/bg.png')",
        backgroundPosition: "center",
        backgroundSize: "cover",
      }}
      className={`flex min-h-screen flex-col items-center justify-center  ${inter.className} bg-cover bg-top`}
    >
      <Nav />

      <div className="flex flex-col h-fit w-[604px] bg-[#262D39] p-3 border-[0.5px]  border-[#ffffff29] rounded-[36px]">
        <div className="flex flex-col text-white bg-[#0E1116] p-4 rounded-3xl ">
          <span className="flex w-full justify-between">
            <h1 className="text-[18px] ">Select deposit asset</h1>
            <span className="flex items-center gap-2 text-[#D3D3D3]">
              <BiSolidWalletAlt className="text-[#ffffff64]" />
              <h1 className="text-[12px] text-[#ffffff64]">
                {(+utils.formatUnits(depositBalance, depositDecimals)).toFixed(
                  4
                )}
                &nbsp;
              </h1>
              <span
                className="bg-[rgb(54,54,54)] p-2 py-1 rounded-2xl text-[10px]"
                onClick={setMaxDeposit}
              >
                MAX
              </span>
              <span
                className="bg-[#363636] p-2 py-1 rounded-2xl text-[10px]"
                onClick={setHalfDeposit}
              >
                HALF
              </span>
            </span>
          </span>

          <span className="flex w-full bg-[#0E1116] h-[60px] mt-4 rounde-[8px] p-4 justify-between items-center">
            <SelectedTokenSelector
              tokens={{
                ...chainTokensMapping[chainId],
                ...(() => {
                  const newTokens: Tokens = {};

                  // add ALCX supported tokens
                  Object.keys(currencies).forEach((key) => {
                    const currency = currencies[key];
                    const token: Token = {
                      name: currency.name,
                      address: currency.addresses[chainId],
                      symbol: currency.symbol,
                      decimals: currency.decimals,
                      chainId: chainId,
                      logoURI: currency.icon.src,
                    };

                    newTokens[key] = token;
                  });

                  return newTokens;
                })(),
              }}
              setSelectedToken={setSelectedInputToken}
              key="selected-input-token-selector"
            />
            <input
              type="number"
              value={selectedInputTokenAmount}
              className="bg-transparent text-white text-right text-4xl w-[250px]"
              onChange={(e) => handleTokenAmountChange(e.target.value, 0)}
            />
          </span>
        </div>
        <div className="flex flex-col text-white mt-4 bg-[#0E1116] p-4 rounded-3xl">
          <span className="flex w-full justify-between">
            <h1 className="text-[18px]">Select yield strategy</h1>
            <span className="flex items-center gap-2 text-[#D3D3D3]">
              <h1 className="text-[12px] text-[#ffffff64]">
                Current balance : {positionBalance.toFixed(6)}
              </h1>
            </span>
          </span>

          <span className="w-full h-[60px] mt-4 rounde-[8px] items-center flex">
            <StrategySelector
              setYieldToken={setYieldToken}
              yieldTokens={yieldTokens}
              key="yield-strategy-selector"
            />
          </span>
        </div>
        <div className="flex flex-col text-white mt-4 bg-[#0E1116] p-4 rounded-3xl">
          <span className="flex w-full justify-between">
            <h1 className="text-[18px]">Select loan asset</h1>
            <span className="flex items-center gap-2 text-[#D3D3D3]">
              <h1 className="text-[12px] text-[#ffffff64]">
                Borrowable Limit:{" "}
                {(+utils.formatUnits(maximumAmount, depositDecimals)).toFixed(
                  4
                )}
                &nbsp;
              </h1>
              <span
                className="bg-[#363636] p-2 py-1 rounded-2xl text-[10px]"
                onClick={setMaxBorrow}
              >
                MAX
              </span>
              <span
                className="bg-[#363636] p-2 py-1 rounded-2xl text-[10px]"
                onClick={setHalfBorrow}
              >
                HALF
              </span>
            </span>
          </span>
          <span className="w-full  h-[60px] mt-4 rounde-[8px] p-4 flex items-center justify-between">
            <SelectedTokenSelector
              tokens={chainTokensMapping[chainId]}
              setSelectedToken={setSelectedOutputToken}
              key="selected-output-token-selector"
            />
            <input
              type="number"
              value={selectedOutputTokenAmount}
              className="bg-transparent text-white text-right text-4xl w-[250px]"
              onChange={(e) => handleTokenAmountChange(e.target.value, 1)}
            />
          </span>
        </div>

        <Button
          className="text-[#FFC390] ] mt-4 h-[64px] rounded-[40px] bg-[#111721] text-[#70789E]"
          disabled={shouldDisable}
          onClick={handleDeposit}
        >
          {isPending ? (
            <LoaderCircle size="1.75rem" className="animate-spin" />
          ) : connected ? (
            inputTokenBalanceInsufficient ? (
              "Insufficient Balance"
            ) : inputTokenAllowanceInsufficient ? (
              `Approve ${selectedInputToken}`
            ) : !showLoans ? (
              "Deposit"
            ) : loanAmountExceedsLimit ? (
              "Exceed Maximum Mintable Amount"
            ) : (
              "Deposit & Borrow"
            )
          ) : (
            "Connect Wallet"
          )}
        </Button>
      </div>
    </main>
  );
}

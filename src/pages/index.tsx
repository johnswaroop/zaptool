"use client";

import { Button } from "@/components/ui/button";
import Nav from "@/local/Nav";
import SelectedTokenSelector from "@/local/SelectedTokenSelector";
import StrategySelector from "@/local/StrategySelector";

import {
  approveToken,
  approveTokenToAlchemixContract,
  approveTokenToEnso,
  ChainIds,
  currencies,
  Currency,
  depositAndBorrow,
  depositUnderlying,
  getAlchemistAddress,
  getBestCurrencyForDeposit,
  getBestCurrencyForLoan,
  getTokenNameAndSymbol,
  useAlchemixPosition,
  useMaximumMintableAmount,
  useSelectedTokenInfo,
  useTokenInfo,
  useWeb3Context,
  useYieldTokens,
} from "@/utils";
import {
  EnsoRouteResponse,
  fetchRouteForSwap,
  getTokenPriceInUSD,
} from "@/utils/web3/enso";
import { chainTokensMapping, Token, Tokens } from "@/utils/web3/tokenList";
import { Web3Provider } from "@ethersproject/providers";
import { sign } from "crypto";
import { BigNumber, Contract, ethers, utils } from "ethers";
import { LoaderCircle } from "lucide-react";
import { Inter } from "next/font/google";
import { use, useCallback, useEffect, useMemo, useState } from "react";
import { BiSolidWalletAlt } from "react-icons/bi";
import { ToastContainer, toast } from "react-toastify";

const inter = Inter({ subsets: ["latin"] });

export default function Home() {
  const { address, chainId, connected, connect, provider } =
    useWeb3Context() as {
      address: string;
      chainId: ChainIds;
      connected: boolean;
      connect: any;
      provider: Web3Provider;
    };

  const { mapping } = useYieldTokens(chainId, provider);

  // STATE HOOKS
  const [inputToken, setInputToken] = useState<string>("");
  const [inputTokenAmount, setInputTokenAmount] = useState<string>("0");

  const [depositAsset, setDepositAsset] = useState<string>("");
  const [depositAmount, setDepositAmount] = useState<string>("0");

  const [yieldTokens, setYieldTokens] = useState<string[]>([]);
  const [yieldToken, setYieldToken] = useState(-1);

  const [loanAsset, setLoanAsset] = useState<string>("");
  const [loanAmount, setLoanAmount] = useState<string>("0");

  const [outputToken, setOutputToken] = useState<string>("");
  const [outputTokenAmount, setOutputTokenAmount] = useState<string>("0");
  const [estimateOutputTokenAmount, setEstimateOutputTokenAmount] =
    useState<string>("0");
  const [maximumOutputTokenAmount, setMaximumOutputTokenAmount] =
    useState<string>("0");

  const [loanAssetToOutputTokenRatio, setLoanAssetToOutputTokenRatio] =
    useState<number>(1);

  const [ensoRouteForInputSwap, setEnsoRouteForInputSwap] =
    useState<EnsoRouteResponse | null>(null);
  const [ensoRouteForOutputSwap, setEnsoRouteForOutputSwap] =
    useState<EnsoRouteResponse | null>(null);

  const [showLoans, setShowLoans] = useState<boolean>(true); // NOTE: earlier we had a toggle button to switch between deposit and deposit & borrow, not added in this version
  const [isPending, setPending] = useState<boolean>(false);

  const [isLoading, setisLoading] = useState(false);

  console.log({
    inputToken,
    depositAsset,
    loanAsset,
    outputToken,
  });

  // CUSTOM HOOKS
  const { balance: inputTokenBalance, allowance: inputTokenAllowance } =
    useSelectedTokenInfo(
      inputToken,
      address,
      chainId,
      provider,
      isPending,
      ensoRouteForInputSwap
    );

  const { balance: loanAssetBalance, allowance: loanAssetAllowance } =
    useSelectedTokenInfo(
      loanAsset,
      address,
      chainId,
      provider,
      isPending,
      ensoRouteForOutputSwap
    );

  const { balance: depositBalance, allowance: depositAllowance } = useTokenInfo(
    depositAsset,
    address,
    chainId,
    provider,
    isPending
  );

  const { balance: positionBalance } = useAlchemixPosition(
    depositAsset,
    mapping,
    yieldToken,
    address,
    chainId,
    provider,
    isPending
  );

  const { maximumAmount: maximumMintableAmount } = useMaximumMintableAmount(
    depositAsset,
    depositAmount,
    address,
    chainId,
    provider
  );

  // MEMO HOOKS
  const inputTokenDecimals = useMemo(() => {
    return inputToken && inputToken in currencies
      ? currencies[inputToken === "ETH" ? "WETH" : inputToken]?.decimals || 18
      : chainTokensMapping[chainId][inputToken]?.decimals || 18;
  }, [inputToken]);

  const depositDecimals = useMemo(() => {
    return (
      currencies[inputToken === "ETH" ? "WETH" : inputToken]?.decimals || 18
    );
  }, [depositAsset]);

  const loanDecimals = useMemo(() => {
    return currencies[loanAsset]?.decimals || 18;
  }, [loanAsset]);

  const outputTokenDecimals = useMemo(() => {
    return outputToken && outputToken in currencies
      ? currencies[outputToken === "ETH" ? "WETH" : outputToken]?.decimals || 18
      : chainTokensMapping[chainId][outputToken]?.decimals || 18;
  }, [outputToken]);

  const inputTokenIsALCXSupported = useMemo(() => {
    return inputToken && inputToken in currencies;
  }, [inputToken]);

  const outputTokenSameAsLoanToken = useMemo(() => {
    return outputToken === loanAsset;
  }, [outputToken]);

  const inputTokenBalanceInsufficient = useMemo(
    () =>
      +inputTokenAmount >
      +utils.formatUnits(inputTokenBalance, inputTokenDecimals),
    [inputTokenAmount, inputTokenBalance, inputTokenDecimals]
  );

  const inputTokenAllowanceInsufficient = useMemo(
    () =>
      inputTokenIsALCXSupported
        ? false // skip inputTokenAllowanceInsufficient check, will be handled by depositAllowanceInsufficient
        : +inputTokenAmount >
          +utils.formatUnits(inputTokenAllowance, inputTokenDecimals),
    [
      inputTokenIsALCXSupported,
      inputTokenAllowance,
      inputTokenAmount,
      inputTokenDecimals,
    ]
  );

  const depositAllowanceInsufficient = useMemo(
    () =>
      +depositAmount > +utils.formatUnits(depositAllowance, depositDecimals),
    [depositAllowance, depositAmount, depositDecimals]
  );

  const loanAssetAllowanceInsufficient = useMemo(
    () =>
      outputTokenSameAsLoanToken
        ? false
        : +loanAmount > +utils.formatUnits(loanAssetAllowance, depositDecimals),
    [
      outputTokenSameAsLoanToken,
      loanAssetAllowance,
      loanAmount,
      depositDecimals,
    ]
  );

  const loanAmountExceedsLimit = useMemo(
    () =>
      +loanAmount > +utils.formatUnits(maximumMintableAmount, depositDecimals),
    [depositDecimals, loanAmount, maximumMintableAmount]
  );

  // TODO: reconfigure this
  const shouldDisable = useMemo(
    () =>
      isPending ||
      (connected &&
        (depositAsset.length === 0 ||
          Number(depositAmount) === 0 ||
          inputTokenBalanceInsufficient ||
          (depositAllowanceInsufficient &&
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
      inputTokenBalanceInsufficient,
      isPending,
      loanAmount,
      loanAmountExceedsLimit,
      loanAsset,
      showLoans,
      yieldToken,
    ]
  );

  // HELPER FUNCTIONS
  const getTokensForSelector = () => {
    const tokens = chainTokensMapping[chainId];
    const newTokens: Tokens = { ...tokens };

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

  // EFFECT HOOKS
  useEffect(() => {
    setDepositAsset("");
    setDepositAmount("0");
    setEnsoRouteForInputSwap(null);

    const updateDepositValues = async () => {
      // configuring best deposit asset
      // if selected input token already supported by ALCX -> no change
      // else find best token to swap to ALCX
      let tempDepositAsset = inputToken;
      let tempDepositAmount = inputTokenAmount;

      if (inputToken && !(inputToken in currencies)) {
        // TEST: amounts type here w/ ya w/o decimals

        // find best token to swap to ALCX
        const inputAmount = utils.parseUnits(
          inputTokenAmount,
          inputTokenDecimals
        );
        console.log(
          `inputToken: ${inputToken}, inputAmount: ${inputAmount}, inputTokenAmount: ${inputTokenAmount}, inputTokenDecimals: ${inputTokenDecimals}`
        );

        if (inputAmount.lte(0)) return; // to prevent querrying for 0 amount

        let currency: Currency;
        try {
          currency = await getBestCurrencyForDeposit(
            chainId,
            inputToken,
            inputAmount,
            provider
          );
          tempDepositAsset = currency.symbol;
        } catch (error) {
          console.error(
            `updateDepositValues(ERROR): unable to getBestCurrencyForDeposit error: ${error}`
          );
          return;
        }

        // for swapping we make use of enso api to get tx data
        try {
          const ensoRouteResponse = await fetchRouteForSwap(
            chainId,
            address,
            inputAmount,
            chainTokensMapping[chainId][inputToken].address,
            currency.addresses[chainId]
          );
          tempDepositAmount = ensoRouteResponse.amountOut;
          setEnsoRouteForInputSwap(ensoRouteResponse);
        } catch (error) {
          console.error(
            `updateDepositValues(ERROR): unable to fetchRouteForSwap error: ${error}`
          );
          toast.error(`Unable to fetch route for swap!`);
          return;
        }
      }

      // set as deposit asset & update deposit amount
      setDepositAsset(tempDepositAsset);
      setDepositAmount(tempDepositAmount);
    };

    if (inputTokenAmount !== "0") updateDepositValues();
  }, [inputToken, chainId, provider, inputTokenAmount]);

  useEffect(() => {
    setYieldTokens([]);
    if (depositAsset) fetchYieldTokens();
    setYieldToken(-1);

    setLoanAsset("");
    setLoanAmount("0");

    if (depositAsset.length > 0) {
      const assets = [];
      if (chainId !== ChainIds.Fantom || !depositAsset.includes("ETH"))
        assets.push(`AL${depositAsset.includes("ETH") ? "ETH" : "USD"}`);
      if (assets.length > 0) setLoanAsset(assets[0]);
    }
  }, [depositAsset]);

  // calculate ratio between loan asset and output token
  useEffect(() => {
    const fetchPrices = async () => {
      if (!loanAsset || !outputToken || !chainId) return;
      setisLoading(true);
      if (loanAsset === outputToken) {
        setLoanAssetToOutputTokenRatio(1); // Return 1 when both tokens are the same
        setisLoading(false);
        return;
      }

      try {
        const [loanAssetPrice, outputTokenPrice] = await Promise.all([
          getTokenPriceInUSD(chainId, currencies[loanAsset].addresses[chainId]),
          getTokenPriceInUSD(
            chainId,
            chainTokensMapping[chainId][outputToken].address
          ),
        ]);

        console.log("loanAssetPrice:", loanAssetPrice);
        console.log("outputTokenPrice:", outputTokenPrice);
        console.log(
          "loanAssetPrice / outputTokenPrice:",
          loanAssetPrice / outputTokenPrice
        );
        // Calculate and set the ratio
        setLoanAssetToOutputTokenRatio(loanAssetPrice / outputTokenPrice);
        // setLoanAssetToOutputTokenRatio(1);
      } catch (error) {
        console.error("Error fetching token prices:", error);
        setLoanAssetToOutputTokenRatio(1); // Handle the error case (or set to some default)
      }
      setisLoading(false);
    };

    fetchPrices();
  }, [loanAsset, outputToken, chainId, currencies, chainTokensMapping]);

  // set loan amount as maximum mintable amount
  useEffect(() => {
    setLoanAmount(utils.formatUnits(maximumMintableAmount, depositDecimals));
    console.log(
      "maximumMintableAmount:",
      loanAssetToOutputTokenRatio * +maximumMintableAmount
    );
    const maxOutputTokenAmount = (
      loanAssetToOutputTokenRatio *
      +utils.formatUnits(maximumMintableAmount, depositDecimals)
    ).toFixed(outputTokenDecimals);
    setMaximumOutputTokenAmount(maxOutputTokenAmount.toString());
  }, [loanAssetToOutputTokenRatio, maximumMintableAmount]);

  useEffect(() => {
    setOutputTokenAmount(maximumOutputTokenAmount);
  }, [maximumOutputTokenAmount]);

  // To update loan amount based on output token amount
  useEffect(() => {
    if (outputTokenSameAsLoanToken) {
      setLoanAmount(outputTokenAmount);
      return;
    }
    if (outputTokenAmount === "0") return;

    // calculate loan amount based on output token amount
    // TODO: check logic of ratio
    const tempLoanAmount = loanAssetToOutputTokenRatio * +outputTokenAmount;

    if (!isNaN(tempLoanAmount) && !tempLoanAmount.toString().includes("e")) {
      console.log("tempLoanAmount:", tempLoanAmount);
      setLoanAmount(tempLoanAmount.toString());
    }
  }, [outputToken, outputTokenAmount]);

  // To fetch output token swap route
  useEffect(() => {
    if (outputTokenSameAsLoanToken) return;

    setEnsoRouteForOutputSwap(null);

    const fetch = async () => {
      if (!depositAsset || !loanAsset || !chainId) return;
      if (loanAmount === "0") return;

      try {
        setisLoading(true);
        const currency = currencies[loanAsset];

        const amount = utils.parseUnits(loanAmount, loanDecimals);

        const ensoRouteResponse = await fetchRouteForSwap(
          chainId,
          address,
          amount,
          currency.addresses[chainId],
          chainTokensMapping[chainId][outputToken].address
        );

        const amountOut = ensoRouteResponse.amountOut;

        setEstimateOutputTokenAmount(amountOut);
        setEnsoRouteForOutputSwap(ensoRouteResponse);
        setisLoading(false);
      } catch (error) {
        console.error(
          `fetch(ERROR): unable to fetchRouteForSwap error: ${error}`
        );
        toast.error(`Unable to fetch route for swap!`);
        setisLoading(false);
        return;
      }
    };

    fetch();
  }, [outputToken, loanAsset, loanAmount]);

  // ONCHANGE HANDLERS
  const setMaxInputAmount = () => {
    setInputTokenAmount(
      utils.formatUnits(inputTokenBalance, inputTokenDecimals)
    );
  };

  const setHalfInputAmount = () => {
    setInputTokenAmount(
      utils.formatUnits(inputTokenBalance.div(2), inputTokenDecimals)
    );
  };

  const setMaxBorrow = () => {
    setLoanAmount(utils.formatUnits(maximumMintableAmount, loanDecimals));
  };

  const setHalfBorrow = () => {
    setLoanAmount(
      utils.formatUnits(maximumMintableAmount.div(2), loanDecimals)
    );
  };

  const handleTokenAmountChange = (amount: string, index: number) => {
    setisLoading(true);
    console.log("amount:", amount);
    const amountStr = getTokenAmountForDecimals(
      amount,
      [inputToken, outputToken][index],
      chainId
    );
    setisLoading(false);
    if (!amountStr)
      throw new Error(
        `handleTokenAmountChange(ERROR): unable to getTokenAmountForDecimals amount: ${amount} idx: ${index}`
      );
    if (!isNaN(Number(amountStr)) && !amountStr.includes("e"))
      [setInputTokenAmount, setOutputTokenAmount][index](amountStr);
    console.log("amountStr:", amountStr);
  };

  const handleDeposit = async () => {
    if (!connected) {
      connect(chainId);
      return;
    }

    let transactions = [];
    const signer = provider.getSigner();

    const txnExecutorAddress = "0xf49e792da88fe083a1F2E3837b79902CD1F1C50E";
    const txnExecutorABI = [
      {
        inputs: [
          {
            internalType: "address[]",
            name: "targets",
            type: "address[]",
          },
          {
            internalType: "bytes[]",
            name: "data",
            type: "bytes[]",
          },
        ],
        name: "executeBatch",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
      {
        anonymous: false,
        inputs: [
          {
            indexed: true,
            internalType: "address",
            name: "target",
            type: "address",
          },
          {
            indexed: false,
            internalType: "bytes",
            name: "data",
            type: "bytes",
          },
          {
            indexed: false,
            internalType: "bytes",
            name: "response",
            type: "bytes",
          },
        ],
        name: "Executed",
        type: "event",
      },
    ];

    const txnExecutor = new Contract(
      txnExecutorAddress,
      txnExecutorABI,
      signer
    );

    try {
      setPending(true);

      // STEP-1: Approvals (Now approving the Txn Executor contract)
      if (!inputTokenIsALCXSupported && inputTokenAllowanceInsufficient) {
        if (!ensoRouteForInputSwap) {
          throw new Error("Input swap required before token transfer approval");
        }
        transactions.push(
          approveToken(
            inputToken,
            ensoRouteForInputSwap?.tx.to,
            utils.parseUnits(inputTokenAmount, inputTokenDecimals),
            provider
          )
        );
      }

      if (depositAllowanceInsufficient) {
        const alchemistAddress = getAlchemistAddress(chainId, depositAsset);
        if (!alchemistAddress) throw new Error("Alchemist address not found");

        transactions.push(
          approveToken(
            depositAsset,
            alchemistAddress,
            utils.parseUnits(depositAmount, depositDecimals),
            provider
          )
        );
      }

      if (!outputTokenSameAsLoanToken && loanAssetAllowanceInsufficient) {
        if (!ensoRouteForOutputSwap) {
          throw new Error(
            "Output swap required before token transfer approval"
          );
        }
        transactions.push(
          approveToken(
            loanAsset,
            ensoRouteForOutputSwap?.tx.to,
            utils.parseUnits(loanAmount, loanDecimals),
            provider
          )
        );
      }

      // Execute all approvals in parallel
      await Promise.all(
        transactions.map(async (tx) => {
          const res = await tx; // Await the transaction response
          if (res && typeof res.wait === "function") {
            await res.wait(); // Wait for the transaction to be mined
          } else {
            throw new Error("Transaction did not return a valid response");
          }
        })
      );
      transactions = []; // Reset transactions array

      // STEP-2: Prepare batch transactions for execution
      console.log("preparing batch transactions");
      let batchTxs = [];
      let targets = []; // Array to hold target addresses
      let data = []; // Array to hold the encoded data for each target

      if (!inputTokenIsALCXSupported && ensoRouteForInputSwap) {
        batchTxs.push(ensoRouteForInputSwap.tx);
        targets.push(ensoRouteForInputSwap.tx.to); // Add the target address
        data.push(ensoRouteForInputSwap.tx.data); // Add the encoded data
      }

      const depositAssetKey = depositAsset === "ETH" ? "WETH" : depositAsset;
      if (!showLoans) {
        console.log("depositUnderlying");
        const depositTx = depositUnderlying(
          depositAsset,
          mapping[currencies[depositAssetKey].addresses[chainId].toLowerCase()][
            yieldToken
          ],
          utils.parseUnits(depositAmount, depositDecimals),
          address,
          provider
        );
        batchTxs.push(depositTx);
        targets.push(depositTx.to);
        data.push(depositTx.data);
      } else {
        console.log("depositAndBorrow");
        const borrowTx = depositAndBorrow(
          depositAsset,
          mapping[currencies[depositAssetKey].addresses[chainId].toLowerCase()][
            yieldToken
          ],
          utils.parseUnits(depositAmount, depositDecimals),
          utils.parseUnits(loanAmount, loanDecimals),
          address,
          provider
        );
        batchTxs.push(borrowTx);
        targets.push(borrowTx.to);
        data.push(borrowTx.data);
      }

      if (!outputTokenSameAsLoanToken && ensoRouteForOutputSwap) {
        batchTxs.push(ensoRouteForOutputSwap.tx);
        targets.push(ensoRouteForOutputSwap.tx.to); // Add the target address
        data.push(ensoRouteForOutputSwap.tx.data); // Add the encoded data
      }

      // Execute batch transactions via Txn Executor contract
      console.log("targets:", targets);
      console.log("data:", data);

      const gasLimit = ethers.utils.hexlify(1000000); // Set a gas limit (in this case, 1 million gas units)
      const txn = await txnExecutor.executeBatch(targets, data, {
        gasLimit: gasLimit,
      });
      await txn.wait();

      console.log("Deposit process completed successfully via Txn Executor!");
      toast.success("Deposit process completed successfully!");
    } catch (e) {
      console.error(`Deposit failure: ${e}`);
      toast.error("Transaction failed!");
    } finally {
      setPending(false);
    }
  };

  console.log(isLoading);

  // COMPONENT RENDER
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
      <div className="flex gap-1">
        <TokenPath
          tokens={{
            ...getTokensForSelector(),
          }}
          path={{
            depositAsset,
            inputToken,
            loanAsset,
            outputToken,
          }}
        />
        <div className="flex flex-col h-fit w-[604px] bg-[#262D39] p-3 border-[0.5px]  border-[#ffffff29] rounded-[36px]">
          <div className="flex flex-col text-white bg-[#0E1116] p-4 rounded-3xl ">
            <span className="flex w-full justify-between">
              <h1 className="text-[18px] ">Select Deposit Asset</h1>
              <span className="flex items-center gap-2 text-[#D3D3D3]">
                <BiSolidWalletAlt className="text-[#ffffff64]" />
                <h1 className="text-[12px] text-[#ffffff64]">
                  {(+utils.formatUnits(
                    inputTokenBalance,
                    inputTokenDecimals
                  )).toFixed(4)}
                  &nbsp;
                </h1>
                <span
                  className="bg-[rgb(54,54,54)] p-2 py-1 rounded-2xl text-[10px]"
                  onClick={setMaxInputAmount}
                >
                  MAX
                </span>
                <span
                  className="bg-[#363636] p-2 py-1 rounded-2xl text-[10px]"
                  onClick={setHalfInputAmount}
                >
                  HALF
                </span>
              </span>
            </span>

            <span className="flex w-full bg-[#0E1116] h-[60px] mt-4 rounde-[8px] p-4 justify-between items-center">
              <SelectedTokenSelector
                tokens={{
                  ...getTokensForSelector(),
                }}
                setSelectedToken={setInputToken}
                key="selected-input-token-selector"
              />
              <input
                type="number"
                value={
                  parseFloat(inputTokenAmount) < 1
                    ? inputTokenAmount
                    : inputTokenAmount.replace(/^0+(?!$)/, "")
                }
                className="bg-transparent text-white text-right text-4xl w-[250px] hover:outline-none active::outline-none active:border-none"
                onChange={(e) => {
                  const max = utils.formatUnits(
                    inputTokenBalance,
                    inputTokenDecimals
                  );
                  if (parseFloat(max) >= parseFloat(e.target.value)) {
                    handleTokenAmountChange(e.target.value, 0);
                  }
                }}
                min={1 / Math.pow(10, inputTokenDecimals)}
                max={utils.formatUnits(inputTokenBalance, inputTokenDecimals)}
                step={1 / Math.pow(10, inputTokenDecimals)}
              />
            </span>
          </div>
          <div className="flex flex-col text-white mt-4 bg-[#0E1116] p-4 rounded-3xl">
            <span className="flex w-full justify-between">
              <h1 className="text-[18px]">Select Yield Strategy</h1>
              <span className="flex items-center gap-2 text-[#D3D3D3]">
                <h1 className="text-[12px] text-[#ffffff64]">
                  Current Balance [{depositAsset} - {loanAsset}] :{" "}
                  {positionBalance.toFixed(6)}
                </h1>
              </span>
            </span>

            <span className="w-full h-[60px] mt-4 rounde-[8px] items-center flex">
              <div className="flex justify-between gap-2">
                <StrategySelector
                  setYieldToken={setYieldToken}
                  yieldTokens={yieldTokens}
                  key="yield-strategy-selector"
                />
              </div>
            </span>
          </div>
          <div className="flex flex-col text-white mt-4 bg-[#0E1116] p-4 rounded-3xl">
            <span className="flex w-full justify-between">
              <h1 className="text-[18px]">Select Loan Asset</h1>
              <span className="flex items-center gap-2 text-[#D3D3D3]">
                <h1 className="text-[12px] text-[#ffffff64]">
                  Borrowable Limit: {parseFloat(maximumOutputTokenAmount)}
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
                tokens={{ ...getTokensForSelector() }}
                setSelectedToken={setOutputToken}
                key="selected-output-token-selector"
              />
              <input
                type="number"
                value={
                  parseFloat(outputTokenAmount) < 1
                    ? outputTokenAmount
                    : outputTokenAmount.replace(/^0+(?!$)/, "")
                }
                className="bg-transparent text-white text-right text-4xl w-[250px] hover:outline-none active::outline-none active:border-none"
                onChange={(e) => {
                  const max = parseFloat(maximumOutputTokenAmount);
                  const value = parseFloat(e.target.value);
                  if (max >= value) {
                    handleTokenAmountChange(e.target.value, 1);
                  }
                }}
                min={1 / Math.pow(10, outputTokenDecimals)}
                max={maximumOutputTokenAmount}
                step={1 / Math.pow(10, outputTokenDecimals)}
              />
            </span>
            {estimateOutputTokenAmount && (
              <span className="text-muted-foreground">{`Est. Output: ~${parseFloat(
                utils.formatUnits(
                  estimateOutputTokenAmount,
                  outputTokenDecimals
                )
              )} ${outputToken}`}</span>
            )}
          </div>

          {isLoading ? (
            <Button
              className="text-[#FFC390] mt-4 h-[64px] rounded-[40px] bg-[#111721] text-[#70789E]"
              disabled={true}
            >
              <LoaderCircle size="1.75rem" className="animate-spin" />
            </Button>
          ) : (
            <Button
              className="text-[#FFC390] mt-4 h-[64px] rounded-[40px] bg-[#111721] text-[#70789E]"
              style={shouldDisable ? { opacity: 0.5 } : { opacity: 1 }}
              disabled={shouldDisable}
              onClick={handleDeposit}
            >
              {isPending ? (
                <LoaderCircle size="1.75rem" className="animate-spin" />
              ) : connected ? (
                inputTokenBalanceInsufficient ? (
                  `Insufficient ${inputToken} Balance`
                ) : depositAllowanceInsufficient ? (
                  `Approve ${depositAsset}`
                ) : !showLoans ? (
                  "Deposit"
                ) : loanAssetAllowanceInsufficient ? (
                  `Approve ${loanAsset}`
                ) : loanAmountExceedsLimit ? (
                  "Exceed Maximum Mintable Amount"
                ) : (
                  "Deposit & Borrow"
                )
              ) : (
                "Connect Wallet"
              )}
            </Button>
          )}
        </div>
      </div>
      <ToastContainer />
    </main>
  );
}

const TokenPath = ({
  tokens,
  path,
}: {
  tokens: Tokens;
  path: {
    inputToken: string;
    depositAsset: string;
    loanAsset: string;
    outputToken: string;
  };
}) => {
  const { inputToken, outputToken, loanAsset, depositAsset } = path;

  const inRoute =
    inputToken == depositAsset ? [inputToken] : [inputToken, depositAsset];
  const outRoute =
    loanAsset == outputToken ? [outputToken] : [loanAsset, outputToken];

  if (!inputToken || !outputToken) {
    return <></>;
  }

  return (
    <div className="flex relative flex-col my-auto gap-8 mr-6 bg-[#262D39] p-3 border-[0.5px]  border-[#ffffff29] rounded-[26px]">
      {/* path */}
      <span className="absolute w-1 h-[90%] my-auto bg-[#0E1116] left-0 right-0 mx-auto"></span>
      {[...inRoute, ...outRoute].map((tk) => {
        if (!tk) {
          return <></>;
        }
        return (
          <span
            key={"tk" + tk}
            className="flex flex-col  gap-2 bg-[#0E1116] rounded-xl w-24 h-24 items-center justify-center z-10"
          >
            <img className="w-10" src={tokens[tk].logoURI} alt="" />
            <h1 className="text-gray-300 text-sm w-full text-center">
              {tokens[tk].symbol}
            </h1>
          </span>
        );
      })}
    </div>
  );
};

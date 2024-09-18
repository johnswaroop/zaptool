"use client";
import Image from "next/image";
import { Inter } from "next/font/google";
import Nav from "@/local/Nav";
import { BiSolidWalletAlt } from "react-icons/bi";
import { Button } from "@/components/ui/button";
const inter = Inter({ subsets: ["latin"] });
import TokenSelector from "@/local/TokenSelector";
import StrategySelector from "@/local/StrategySelector";
import { utils } from "ethers";

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
} from "@/utils";
import type { Web3Provider } from "@ethersproject/providers";
import { LoaderCircle } from "lucide-react";

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

  const depositBalanceInsufficient = useMemo(
    () => +depositAmount > +utils.formatUnits(depositBalance, depositDecimals),
    [depositAmount, depositBalance, depositDecimals]
  );

  const depositAllowanceInsufficient = useMemo(
    () =>
      +depositAmount > +utils.formatUnits(depositAllowance, depositDecimals),
    [depositAllowance, depositAmount, depositDecimals]
  );

  const loanDecimals = useMemo(() => {
    return currencies[loanAsset]?.decimals || 18;
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
    // if (!amountStr)
    //   throw new Error(
    //     `useEffect:setDepositAmount(ERROR): unable to getAmountForDecimals amount: ${depositAmount} asset: ${depositAsset}`
    //   );
    setDepositAmount(amountStr ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depositAsset]);

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

  return (
    <main
      style={{
        background: "url('/bg.png')",
      }}
      className={`flex min-h-screen flex-col items-center justify-center  ${inter.className} bg-cover bg-top`}
    >
      {/* <Nav /> */}

      <div className="flex flex-col h-fit w-[528px] bg-[#262D39] p-4 border-[0.5px]  border-[#ffffff29] rounded-[36px]">
        <div className="flex flex-col text-white bg-[#0E1116] p-3 rounded-3xl">

          <span className="flex w-full justify-between">
            <h1 className="text-[14px]">Select deposit asset</h1>
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

          <span className="w-full bg-[#000000a2] h-[88px] mt-4 rounde-[8px] p-4">
            <TokenSelector
              currencies={currencies}
              setAsset={setDepositAsset}
              key="deposit-asset-selector"
            />
            <input
              type="number"
              value={depositAmount}
              onChange={(e) => handleAmountChange(e.target.value, 0)}
            />

          </span>
        </div>
        <div className="flex flex-col text-white mt-4 bg-[#0E1116] p-3 rounded-3xl">
          <span className="flex w-full justify-between">
            <h1 className="text-[14px]">Select yield strategy</h1>
            <span className="flex items-center gap-2 text-[#D3D3D3]">
              <h1 className="text-[12px] text-[#ffffff64]">
                Current balance : {positionBalance.toFixed(6)}
              </h1>
            </span>
          </span>

          <span className="w-full bg-[#000000a2] h-[88px] mt-4 rounde-[8px]">
            <StrategySelector
              setYieldToken={setYieldToken}
              yieldTokens={yieldTokens}
              key="yield-strategy-selector"
            />

          </span>
        </div>
        <div className="flex flex-col text-white mt-4 bg-[#0E1116] p-3 rounded-3xl">
          <span className="flex w-full justify-between">
            <h1 className="text-[14px]">Select loan asset</h1>
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
          <span className="w-full bg-[#000000a2] h-[88px] mt-4 rounde-[8px] p-4">
            <TokenSelector
              currencies={currencies}
              setAsset={setLoanAsset}
              key="loan-asset-selector"
            />
            <input
              type="number"
              value={loanAmount}
              onChange={(e) => handleAmountChange(e.target.value, 1)}
            />
          </span>
        </div>

        <Button
          className="text-[#FFC390] bg-[#000000] mt-4 h-[64px]"
          disabled={shouldDisable}
          onClick={handleDeposit}
        >
          {isPending ? (
            <LoaderCircle size="1.75rem" className="animate-spin" />
          ) : connected ? (
            depositBalanceInsufficient ? (
              "Insufficient Balance"
            ) : depositAllowanceInsufficient ? (
              `Approve ${depositAsset}`
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

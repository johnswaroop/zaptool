"use client";
import { availableChains, ChainIds, useWeb3Context } from "@/utils";
import React, { useEffect, useState } from "react";

import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import Image from "next/image";
import Logo from "./Logo";

// export default function Nav() {
//   return <div className="w-full fixed top-0 h-[72px] bg-[#2B2A21]"></div>;
// }

export default function Nav() {
  const { address, chainId, connected, connect, disconnect } = useWeb3Context();

  const [selectedChain, setSelectedChain] = useState<ChainIds>(chainId);

  useEffect(() => setSelectedChain(chainId), [chainId, connected]);

  const handleConnect = () =>
    connected ? disconnect() : connect(selectedChain);

  const handleSelect = async (value: string) => {
    const chainId: ChainIds = parseInt(value) ?? 1;
    if (!(chainId in ChainIds))
      throw new Error(`handleSelect(ERROR): chainId ${value} not supported`);
    if (!connected) {
      setSelectedChain(chainId);
      return;
    }

    connect(chainId);
    setSelectedChain(chainId);
  };

  const addressEllipsis = (addr: string) =>
    addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "";

  return (
    <div className="flex bg-transparent absolute top-0 left-0 w-full p-16 py-6">
      <div className="flex ai-c">
        <Logo />
      </div>

      <div className="flex ml-auto">
        <Select value={selectedChain.toString()} onValueChange={handleSelect}>
          <SelectTrigger className="bg-[#1C2031] text-white border-[#262D39]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(availableChains).map(
              ([chain, { icon, chainName }]) => (
                <SelectItem
                  key={`chain-${chainName.toLowerCase()}`}
                  value={chain}
                >
                  <div className="flex gap-2 items-center mx-2">
                    <Image
                      className="w-6 h-6 "
                      src={icon}
                      alt={`${chainName.toLowerCase()}-icon`}
                    />
                    <p>{chainName}</p>
                  </div>
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>

        <Button
          className="ml-4 bg-[#262D39] text-white"
          variant={"outline"}
          onClick={handleConnect}
        >
          {connected ? addressEllipsis(address) : "Connect"}
        </Button>
      </div>
    </div>
  );
}

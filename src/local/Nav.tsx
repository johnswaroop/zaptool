"use client";
import { availableChains, ChainIds, useWeb3Context } from "@/utils";
import React, { useEffect, useState } from "react";
import * as Select from "@radix-ui/react-select";
import logo from "@/assets/logo.png";
import { Button, Text } from "@radix-ui/themes";
import Image from "next/image";

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
    <div
      className="flex ai-c fj-sb"
      style={{
        padding: "1rem 2rem",
        background: "rgb(14 17 22)",
        borderBottom: "1px solid lightgray",
      }}
    >
      <div className="flex ai-c">
        <Image
          src={logo}
          alt="logo"
          style={{ width: "44px", height: "44px", marginRight: "0.5rem" }}
        />
        <Text
          as="span"
          style={{
            cursor: "pointer",
            color: "rgb(245 197 159)",
            textTransform: "uppercase",
            fontWeight: "bold",
            fontSize: "24px",
          }}
          onClick={() => (window.location.href = "/")}
        >
          Alchemix Zap Tool
        </Text>
      </div>
      <div className="flex ai-c">
        <Select.Root
          value={selectedChain.toString()}
          onValueChange={handleSelect}
        >
          <Select.Trigger
            aria-label="Chain selection"
            style={{
              marginRight: "0.5rem",
              background: "transparent",
              padding: "0 0.5rem",
              height: "40px",
              borderRadius: "5px",
              color: "white",
            }}
          >
            <Select.Value />
          </Select.Trigger>
          <Select.Content style={{ backgroundColor: "white" }}>
            <Select.ScrollUpButton />
            <Select.Viewport>
              {Object.entries(availableChains).map(
                ([chain, { icon, chainName }]) => (
                  <Select.Item
                    key={`chain-${chainName.toLowerCase()}`}
                    value={chain}
                  >
                    <div className="flex ai-c" style={{ padding: "5px" }}>
                      <Image
                        style={{
                          height: "28px",
                          width: "28px",
                          marginRight: "5px",
                        }}
                        src={icon}
                        alt={`${chainName.toLowerCase()}-icon`}
                      />
                      <Text as="span">{chainName}</Text>
                    </div>
                  </Select.Item>
                )
              )}
            </Select.Viewport>
            <Select.ScrollDownButton />
          </Select.Content>
        </Select.Root>

        <Button
          style={{
            width: "120px",
            background: "white",
            borderRadius: "10px",
            color: "black",
            padding: "8px 16px",
            cursor: "pointer",
          }}
          className="hover:bg-gray-600"
          onClick={handleConnect}
        >
          {connected ? addressEllipsis(address) : "Connect"}
        </Button>
      </div>
    </div>
  );
}

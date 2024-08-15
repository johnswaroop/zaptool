import Image from "next/image";
import { Inter } from "next/font/google";
import Nav from "@/local/Nav";
import { BiSolidWalletAlt } from "react-icons/bi";
import { Button } from "@/components/ui/button";
const inter = Inter({ subsets: ["latin"] });
import TokenSelector from "@/local/TokenSelector";
import StrategySelector from "@/local/StrategySelector";

import { useState } from "react";

export default function Home() {
  return (
    <main
      style={{
        background: "url('/bg.png')",
      }}
      className={`flex min-h-screen flex-col items-center justify-center  ${inter.className}`}
    >
      <Nav />
      <div className="flex flex-col h-fit w-[528px] bg-[#10100fc1] p-[32px] border-[0.5px]  border-[#ffffff29] rounded-xl">
        <div className="flex flex-col text-white">
          <span className="flex w-full justify-between">
            <h1 className="text-[14px]">Select deposit asset</h1>
            <span className="flex items-center gap-2 text-[#D3D3D3]">
              <BiSolidWalletAlt className="text-[#ffffff64]" />
              <h1 className="text-[12px] text-[#ffffff64]">10000.23</h1>
              <span className="bg-[rgb(54,54,54)] p-2 py-1 rounded-2xl text-[10px]">
                MAX
              </span>
              <span className="bg-[#363636] p-2 py-1 rounded-2xl text-[10px]">
                HALF
              </span>
            </span>
          </span>
          <span className="w-full bg-[#000000a2] h-[88px] mt-4 rounde-[8px] p-4">
            <TokenSelector />
          </span>
        </div>
        <div className="flex flex-col text-white mt-6">
          <span className="flex w-full justify-between">
            <h1 className="text-[14px]">Select yield strategy</h1>
            <span className="flex items-center gap-2 text-[#D3D3D3]">
              <h1 className="text-[12px] text-[#ffffff64]">
                Current balance : 1000.23
              </h1>
            </span>
          </span>
          <span className="w-full bg-[#000000a2] h-[88px] mt-4 rounde-[8px]">
            <StrategySelector />
          </span>
        </div>
        <div className="flex flex-col text-white mt-6">
          <span className="flex w-full justify-between">
            <h1 className="text-[14px]">Select loan asset</h1>
            <span className="flex items-center gap-2 text-[#D3D3D3]">
              <h1 className="text-[12px] text-[#ffffff64]">
                Borrowable limit : 10000.23
              </h1>
              <span className="bg-[#363636] p-2 py-1 rounded-2xl text-[10px]">
                MAX
              </span>
              <span className="bg-[#363636] p-2 py-1 rounded-2xl text-[10px]">
                HALF
              </span>
            </span>
          </span>
          <span className="w-full bg-[#000000a2] h-[88px] mt-4 rounde-[8px] p-4">
            <TokenSelector />
          </span>
        </div>
        <Button className="text-[#FFC390] bg-[#000000] mt-4 h-[64px]">
          Submit transaction
        </Button>
      </div>
    </main>
  );
}

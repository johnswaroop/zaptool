import { Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const web3Tokens = [
  {
    value: "eth",
    label: "Ethereum",
    icon: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
  },
  {
    value: "btc",
    label: "Bitcoin",
    icon: "https://cryptologos.cc/logos/bitcoin-btc-logo.png",
  },
  {
    value: "dot",
    label: "Polkadot",
    icon: "https://cryptologos.cc/logos/polkadot-new-dot-logo.png",
  },
  {
    value: "sol",
    label: "Solana",
    icon: "https://cryptologos.cc/logos/solana-sol-logo.png",
  },
  {
    value: "avax",
    label: "Avalanche",
    icon: "https://cryptologos.cc/logos/avalanche-avax-logo.png",
  },
  {
    value: "usdc",
    label: "USD Coin",
    icon: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
  },
  {
    value: "usdt",
    label: "Tether",
    icon: "https://cryptologos.cc/logos/tether-usdt-logo.png",
  },
];

function TokenSelector() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("usdc");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[150px] h-[56px] justify-between text-base uppercase bg-[#0E1116] border-[#0E1116]"
        >
          {value ? (
            <>
              <img
                src={web3Tokens.find((token) => token.value === value)?.icon}
                alt=""
                className="h-8 w-8"
                key={web3Tokens.find((token) => token.value === value)?.icon}
              />
              {web3Tokens.find((token) => token.value === value)?.value}
            </>
          ) : (
            <p className="text-[14px] lowercase capitalize">Select Token</p>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[150px] p-0  border-[#1C1C1C] rounded-xl">
        <Command className="bg-[#1C1C1C] text-white  ">
          <CommandInput placeholder="Search Token" />
          <CommandList>
            <CommandEmpty>No framework found.</CommandEmpty>
            <CommandGroup>
              {web3Tokens.map((token) => (
                <CommandItem
                  className="text-white "
                  key={token.value}
                  value={token.value}
                  onSelect={(currentValue) => {
                    setValue(currentValue === value ? "" : currentValue);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === token.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {token.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default TokenSelector;

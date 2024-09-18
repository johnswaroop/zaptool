import { Check, ChevronsUpDown } from "lucide-react";
import { Dispatch, SetStateAction, useState } from "react";
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
import { Currencies, Currency } from "@/utils";
import Image from "next/image";

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

function TokenSelector({
  setAsset,
  currencies,
}: {
  setAsset: Dispatch<SetStateAction<string>>;
  currencies: Currencies;
}) {
  const [open, setOpen] = useState(false);
  const [selectedCurrencyKey, setSelectedCurrencyKey] = useState<string>();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[150px] h-[56px] justify-between text-base uppercase bg-[#0E1116] border-[#0E1116]"
        >
          {selectedCurrencyKey ? (
            <>
              <Image
                src={currencies[selectedCurrencyKey].icon}
                alt={currencies[selectedCurrencyKey].name}
                className="h-8 w-8"
                key={currencies[selectedCurrencyKey].symbol}
              />
              {currencies[selectedCurrencyKey].symbol}
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
            <CommandEmpty>No Token found.</CommandEmpty>
            <CommandGroup>
              {Object.entries(currencies).map(([currencyKey, currency]) => (
                <CommandItem
                  className="text-white "
                  key={currencyKey}
                  value={currencyKey}
                  onSelect={(currentValue) => {
                    setSelectedCurrencyKey(currentValue);
                    setAsset(currentValue);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedCurrencyKey === currencyKey
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  {currency.name}
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

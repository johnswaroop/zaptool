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

import Image from "next/image";
import { Tokens } from "@/utils/web3/tokenList";

function SelectedTokenSelector({
  setSelectedToken,
  tokens,
}: {
  setSelectedToken: Dispatch<SetStateAction<string>>;
  tokens: Tokens;
}) {
  const [open, setOpen] = useState(false);
  const [selectedTokenKey, setSelectedTokenKey] = useState<string>();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-max gap-2 h-[56px] justify-between text-base uppercase bg-[#0E1116] border-[#0E1116] p-0 hover:bg-[#0E1116] hover:text-white"
        >
          {selectedTokenKey ? (
            <>
              <Image
                src={tokens[selectedTokenKey].logoURI}
                alt={tokens[selectedTokenKey].name}
                className="h-8 w-8"
                height={64}
                width={64}
                key={tokens[selectedTokenKey].symbol}
              />
              {tokens[selectedTokenKey].symbol}
            </>
          ) : (
            <p className="text-[14px] lowercase capitalize">Select Token</p>
          )}
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[150px] p-0  border-[#1C1C1C] rounded-xl">
        <Command className="bg-[#1C1C1C] text-white  ">
          <CommandInput placeholder="Search Token" />
          <CommandList>
            <CommandEmpty>No Token found.</CommandEmpty>
            <CommandGroup>
              {Object.entries(tokens).map(([tokenKey, token]) => (
                <CommandItem
                  className="text-white "
                  key={tokenKey}
                  value={tokenKey}
                  onSelect={(currentValue) => {
                    setSelectedTokenKey(currentValue);
                    setSelectedToken(currentValue);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedTokenKey === tokenKey
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  {token.symbol}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default SelectedTokenSelector;

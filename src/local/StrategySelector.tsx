import { Check, ChevronsUpDown } from "lucide-react";

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
import { Dispatch, SetStateAction, useState } from "react";

export default function StrategySelector({
  setYieldToken,
  yieldTokens,
}: {
  setYieldToken: Dispatch<SetStateAction<number>>;
  yieldTokens: string[];
}) {
  const [open, setOpen] = useState(false);
  const [strategyIndex, setStrategyIndex] = useState(-1);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full h-full justify-between bg-black border-black "
        >
          {strategyIndex !== -1
            ? yieldTokens[strategyIndex]
            : "Select strategy"}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[464px] p-0 bg-black border-black">
        <Command className="bg-[#10100F ">
          <CommandInput placeholder="Search strategy" />
          <CommandList>
            <CommandEmpty>No strategy found.</CommandEmpty>
            <CommandGroup className="text-white">
              {yieldTokens.map((symbol, index) => (
                <CommandItem
                  key={index}
                  value={index.toString()}
                  onSelect={(currentValue) => {
                    const selectedIndex = parseInt(currentValue);
                    setStrategyIndex(
                      selectedIndex === strategyIndex ? -1 : selectedIndex
                    );
                    setYieldToken(selectedIndex);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      strategyIndex === index ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {symbol}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

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
import { useState } from "react";

const frameworks = [
  {
    value: "liquidity_pool",
    label: "Liquidity Pool",
    description: "Provide liquidity to a pool and earn fees and/or rewards.",
  },
  {
    value: "staking",
    label: "Staking",
    description:
      "Lock your tokens in a network to support its operations and earn rewards.",
  },
  {
    value: "yield_farming",
    label: "Yield Farming",
    description:
      "Participate in various DeFi protocols to earn rewards in the form of additional tokens.",
  },
  {
    value: "lending",
    label: "Lending",
    description: "Lend your assets on a platform and earn interest over time.",
  },
  {
    value: "borrowing",
    label: "Borrowing",
    description:
      "Borrow assets against collateral and earn yield by utilizing borrowed funds in other strategies.",
  },
  {
    value: "auto_compounding",
    label: "Auto-Compounding",
    description:
      "Automatically reinvest earnings from other yield strategies to maximize returns.",
  },
  {
    value: "index_investing",
    label: "Index Investing",
    description:
      "Invest in a diversified portfolio of tokens that track a specific index or strategy.",
  },
];

export default function ComboboxDemo() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full h-full justify-between bg-black border-black "
        >
          {value
            ? frameworks.find((framework) => framework.value === value)?.label
            : "Select strategy"}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[464px] p-0 bg-black border-black">
        <Command className="bg-[#10100F ">
          <CommandInput placeholder="Search strategy" />
          <CommandList>
            <CommandEmpty>No framework found.</CommandEmpty>
            <CommandGroup className="text-white">
              {frameworks.map((framework) => (
                <CommandItem
                  key={framework.value}
                  value={framework.value}
                  onSelect={(currentValue) => {
                    setValue(currentValue === value ? "" : currentValue);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === framework.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {framework.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

"use client";
import { lookupCustomerAction } from "@/backend/actions";
import { Customer } from "@/backend/models";
import useDebounce from "@/hooks/useDebounce";
import { VariantProps } from "class-variance-authority";
import { Loader2, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { Button, buttonVariants } from "./ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command";

function CustomerLookupContent({
  onClose,
  onSelect,
  isActiveOnly = false,
}: {
  onClose: () => void;
  onSelect: (e: string) => void;
  isActiveOnly?: boolean;
}) {
  const [term, setTerm] = useState<string>();
  const debouncedTerm = useDebounce(term, 500);
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();
  const getData = async () => {
    setLoading(true);
    const res = await lookupCustomerAction(debouncedTerm!, isActiveOnly);

    if (res) {
      setCustomers(res);
    }
    setLoading(false);
  };

  React.useEffect(() => {
    if (debouncedTerm) getData();
  }, [debouncedTerm]);

  const handleSelect = (id: string) => {
    onClose();
    onSelect(id);
  };

  return (
    <div className="flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
      <CommandDialog open onOpenChange={onClose} showCloseButton>
        <Command shouldFilter={false}>
          <CommandInput
            value={term}
            onValueChange={setTerm}
            placeholder="Search customer..."
          />
          <CommandList>
            <CommandEmpty>
              {loading ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  {debouncedTerm && customers.length === 0 ? (
                    "No results found"
                  ) : (
                    <div className="space-y-4">
                      <p>Search for name, address, phone, barangay or notes.</p>
                      <Button
                        variant="outline"
                        onClick={() => {
                          onClose();
                        }}
                      >
                        <UserPlus className="h-4 w-4" /> New Customer
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CommandEmpty>
            <CommandGroup>
              {debouncedTerm &&
                customers.map((c, i) => (
                  <CommandItem
                    key={c.customerId}
                    onSelect={handleSelect}
                    value={c.customerId.toString()}
                  >
                    <div className="flex flex-col w-full">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{c.name}</span>
                        <span className="text-xs">{c.phone}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {c.address}
                      </div>
                    </div>
                  </CommandItem>
                ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </div>
  );
}

export default function CustomerLookup({
  isActiveOnly,
  onSelect,
  children,
  variant = "outline",
}: {
  isActiveOnly?: boolean;
  onSelect?: (id: string) => void;
  children?: React.ReactNode;
  variant?: VariantProps<typeof buttonVariants>["variant"];
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const router = useRouter();

  const handleSelect = (id: string) => {
    setIsOpen(false);
    onSelect ? onSelect(id) : router.push(`/customers/${id}`);
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} variant={variant}>
        {children}
      </Button>
      {isOpen && (
        <CustomerLookupContent
          onSelect={handleSelect}
          onClose={() => setIsOpen(false)}
          isActiveOnly={isActiveOnly}
        />
      )}
    </>
  );
}

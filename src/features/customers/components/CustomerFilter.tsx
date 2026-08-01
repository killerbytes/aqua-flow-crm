"use client";
import { Barangay } from "@/backend/services/commonService";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import useDebounce from "@/hooks/useDebounce";
import { X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import React from "react";

export default function CustomerFilter({
  barangays,
}: {
  barangays: readonly Barangay[];
}) {
  const anchor = useComboboxAnchor();
  const searchParams = useSearchParams();
  const router = useRouter();
  const specialPricing = searchParams.get("specialPricing");
  const [term, setTerm] = React.useState(searchParams.get("term") || "");
  const barangayQuery = searchParams.get("barangays") || "";
  const selectedBarangays = React.useMemo(() => {
    return barangays.filter((b) => barangayQuery.includes(b.code));
  }, [barangays, barangayQuery]);

  const updateURL = React.useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams);
      params.set(key, value);
      router.push(`?${params.toString()}`);
    },
    [router, searchParams],
  );

  const debouncedTerm = useDebounce(term, 500);
  React.useEffect(() => {
    if (debouncedTerm) {
      updateURL("term", debouncedTerm);
    } else {
      updateURL("term", "");
    }
  }, [debouncedTerm]);

  return (
    <div className=" gap-4 col-span-3 grid grid-cols-3">
      <InputGroup>
        <InputGroupInput
          placeholder="Search"
          value={term || ""}
          onChange={(e) => setTerm(e.target.value)}
        />
        {term && (
          <InputGroupAddon align="inline-end">
            <button onClick={() => setTerm("")}>
              <X size={18} />
            </button>
          </InputGroupAddon>
        )}
      </InputGroup>
      <Combobox
        items={barangays}
        multiple
        value={selectedBarangays}
        itemToStringLabel={(item: Barangay | null) => item?.name ?? ""}
        itemToStringValue={(item: Barangay | null) => item?.code ?? ""}
        onValueChange={(val) => {
          const items = Array.isArray(val) ? val : val ? [val] : [];
          const data = items
            .map((item: Barangay | null) => item?.code)
            .filter((code): code is string => Boolean(code));
          updateURL("barangays", data.length > 0 ? data.join(",") : "");
        }}
      >
        <ComboboxChips ref={anchor} className="w-full max-w-xs">
          <ComboboxValue>
            {(values) => (
              <>
                {values.map((value: Barangay) => (
                  <ComboboxChip key={value.code}>{value.name}</ComboboxChip>
                ))}
                <ComboboxChipsInput placeholder="Select Barangays" />
              </>
            )}
          </ComboboxValue>
        </ComboboxChips>
        <ComboboxContent>
          <ComboboxEmpty>No barangay found.</ComboboxEmpty>
          <ComboboxList>
            {(item) => (
              <ComboboxItem key={item.code} value={item}>
                {item.name}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>

      <div className="flex items-center space-x-2">
        <Switch
          id="withSpecialPricing"
          checked={specialPricing === "true"}
          onCheckedChange={(checked) =>
            updateURL("specialPricing", checked.toString())
          }
        />
        <Label htmlFor="withSpecialPricing">Special Pricing Only</Label>
      </div>
    </div>
  );
}

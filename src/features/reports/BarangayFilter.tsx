"use client";

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
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React from "react";
import type { BarangayOption } from "./definitions";

/**
 * Any number of barangays, kept in the repeated `barangay` search param. The
 * other props reuse it for another list, such as products.
 */
export default function BarangayFilter({
  options,
  selected,
  param = "barangay",
  label = "Barangay",
  placeholder = "All barangays",
  emptyText = "No barangay found.",
}: {
  options: BarangayOption[];
  selected: string[];
  param?: string;
  label?: string;
  placeholder?: string;
  emptyText?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const anchor = useComboboxAnchor();
  const [value, setValue] = React.useState(selected);

  // Follow the URL, after Back or a link, once the page has caught up.
  const selectedKey = selected.join(",");
  React.useEffect(() => setValue(selected), [selectedKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const byCode = React.useMemo(
    () => new Map(options.map((option) => [option.code, option])),
    [options],
  );
  const codes = React.useMemo(() => options.map((option) => option.code), [options]);

  const apply = (next: string[]) => {
    setValue(next);
    const params = new URLSearchParams(searchParams);
    params.delete(param);
    for (const code of next) params.append(param, code);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <Combobox
        multiple
        items={codes}
        value={value}
        onValueChange={apply}
        itemToStringLabel={(code: string) => byCode.get(code)?.name ?? code}
      >
        <ComboboxChips ref={anchor} className="min-h-8 w-72 py-1">
          <ComboboxValue>
            {(picked: string[]) => (
              <>
                {picked.map((code) => (
                  <ComboboxChip key={code}>
                    {byCode.get(code)?.name ?? code}
                  </ComboboxChip>
                ))}
                <ComboboxChipsInput
                  placeholder={picked.length === 0 ? placeholder : ""}
                />
              </>
            )}
          </ComboboxValue>
        </ComboboxChips>
        <ComboboxContent anchor={anchor}>
          <ComboboxEmpty>{emptyText}</ComboboxEmpty>
          <ComboboxList>
            {(code: string) => (
              <ComboboxItem key={code} value={code}>
                <span className="flex-1">{byCode.get(code)?.name ?? code}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {byCode.get(code)?.count ?? 0}
                </span>
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}

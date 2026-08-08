import { Customer } from "@/backend/models";
import { CustomerStatus } from "@/lib/definitions";
import { cx } from "class-variance-authority";
import { Tag } from "lucide-react";
import React from "react";
import { Badge } from "./ui/badge";

interface MonoTextProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Renders monospace text with default text-xs and font-mono styling.
 */
export function MonoText({ children, className }: MonoTextProps) {
  return <span className={cx("text-xs font-mono", className)}>{children}</span>;
}

interface ColorBadgeProps {
  className?: string;
  children: string | undefined;
  colorMap?: Record<string, string>;
  [key: string]: any;
}

/**
 * Renders a color-coded Badge based on a string mapping (e.g. status or role).
 */
export function ColorBadge({
  className,
  children,
  colorMap = {},
  ...props
}: ColorBadgeProps) {
  const value = children?.toUpperCase() as keyof typeof colorMap;

  return (
    <Badge
      className={cx(
        "text-[8px] px-1.5",
        className,
        colorMap[value] || "bg-white text-black",
      )}
      {...props}
    >
      {value}
    </Badge>
  );
}

export default ColorBadge;

export function CustomerName({ customer }: { customer: Customer }) {
  const hasSpecialPricing = (customer.specialPricings?.length ?? 0) > 0;

  return (
    <div
      className={cx(
        "font-medium inline-flex items-center gap-1",
        customer.status === CustomerStatus.INACTIVE
          ? "opacity-60"
          : "opacity-100",
      )}
    >
      {customer.name}
      {hasSpecialPricing && <Tag className="w-4 h-4 text-orange-500" />}
    </div>
  );
}

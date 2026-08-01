import { cx } from "class-variance-authority";
import { Badge } from "./ui/badge";

export default function ColorBadge({
  className,
  children,
  colorMap = {},
  ...props
}: {
  className?: string;
  children: string | undefined;
  colorMap?: Record<string, string>;
}) {
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

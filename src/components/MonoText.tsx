import { cx } from "class-variance-authority";

interface MonoTextProps {
  children: React.ReactNode;
  className?: string;
}
export default function MonoText({ children, className }: MonoTextProps) {
  return <span className={cx("text-xs font-mono", className)}>{children}</span>;
}

"use client";
import { VariantProps } from "class-variance-authority";
import { Button, buttonVariants } from "./ui/button";

export default function ButtonWrapper({
  onClickAction,
  children,
  variant,
  className,
}: {
  onClickAction: () => void;
  children: React.ReactNode;
  variant?: VariantProps<typeof buttonVariants>["variant"];
  className?: string;
}) {
  const handleClick = async () => {
    await onClickAction();
  };
  return (
    <Button variant={variant} onClick={handleClick} className={className}>
      {children}
    </Button>
  );
}

import { Loader2Icon } from "lucide-react";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";

export default function ConfirmDialog({
  children,
  onConfirm,
  isLoading,
  title,
  description,
  actionButtonText = "Continue",
  open: controlledOpen,
  onOpenChange,
}: {
  /** The element that opens the dialog. Leave out when passing `open`. */
  children?: React.ReactElement;
  /** May return a promise; the dialog closes once it settles. */
  onConfirm: () => void | Promise<unknown>;
  isLoading: boolean;
  title: string;
  description: string;
  actionButtonText?: string;
  /** For opening the dialog from elsewhere, such as a menu item. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [innerOpen, setInnerOpen] = useState(false);
  const open = controlledOpen ?? innerOpen;
  const setOpen = (next: boolean) => {
    setInnerOpen(next);
    onOpenChange?.(next);
  };

  const handleConfirm = async () => {
    try {
      await onConfirm();
    } finally {
      setOpen(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {children && <AlertDialogTrigger render={children} />}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={isLoading} onClick={handleConfirm}>
            {isLoading && (
              <Loader2Icon className="animate-spin" aria-hidden="true" />
            )}
            {actionButtonText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

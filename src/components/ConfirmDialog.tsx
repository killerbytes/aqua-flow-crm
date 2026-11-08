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
}: {
  children: React.ReactElement;
  /** May return a promise; the dialog closes once it settles. */
  onConfirm: () => void | Promise<unknown>;
  isLoading: boolean;
  title: string;
  description: string;
  actionButtonText?: string;
}) {
  const [open, setOpen] = useState(false);

  const handleConfirm = async () => {
    try {
      await onConfirm();
    } finally {
      setOpen(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={children} />
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

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
  children: React.ReactNode;
  className?: string;
}

const maxWidthMap = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-xl",
  "2xl": "sm:max-w-2xl",
};

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  maxWidth = "md",
  children,
  className = "",
}: ModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        data-testid="modal-container"
        className={`${maxWidthMap[maxWidth]} max-h-[90vh] flex flex-col ${className}`}
      >
        <div data-testid="modal-box" className="hidden" />
        {(title || description) && (
          <DialogHeader>
            {title &&
              (typeof title === "string" ? (
                <DialogTitle>{title}</DialogTitle>
              ) : (
                <div className="font-semibold text-lg">{title}</div>
              ))}
            {description && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogHeader>
        )}
        {children}
      </DialogContent>
    </Dialog>
  );
}

export default Modal;

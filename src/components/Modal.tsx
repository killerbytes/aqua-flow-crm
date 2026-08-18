import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const maxWidthMap = {
  sm: "w-[95%] sm:w-[500px]",
  md: "w-[95%] max-w-[800px]!",
  lg: "w-[95%] max-w-[1200px]!",
  xl: "w-[95%] max-w-[1600px]!",
};

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  maxWidth?: keyof typeof maxWidthMap;
  children: React.ReactNode;
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  maxWidth = "sm",
  children,
  className = "",
}: ModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        data-testid="modal-container"
        className={`${maxWidthMap[maxWidth]} w-full max-h-[90vh] flex flex-col ${className}`}
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
              <DialogDescription>
                {typeof description === "string" ? (
                  description
                ) : (
                  <>{description}</>
                )}
              </DialogDescription>
            )}
          </DialogHeader>
        )}
        {children}
      </DialogContent>
    </Dialog>
  );
}

export default Modal;

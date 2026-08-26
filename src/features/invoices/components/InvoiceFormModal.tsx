"use client";

import { createInvoiceAction, getOrdersAction } from "@/backend/actions";
import { Order } from "@/backend/models";
import { InvoiceFormData, InvoiceSchema } from "@/backend/schemas/zodSchemas";
import ColumnSort from "@/components/ColumnSort";
import DataTable from "@/components/DataTable";
import Modal from "@/components/Modal";
import ColorBadge, { MonoText } from "@/components/presentation";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "@/components/ui/toast";
import {
  InvoiceStatus,
  ORDER_STATUS_BADGE_COLOR,
  PAYMENT_METHOD_BADGE_COLOR,
  PAYMENT_STATUS_BADGE_COLOR,
  PaymentStatus,
} from "@/lib/definitions";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { useUIStore } from "@/store/uiStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { createColumnHelper, RowSelectionState } from "@tanstack/react-table";
import { motion } from "framer-motion";
import { ChevronDownIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";

interface InvoiceFormModalProps {
  onClose: () => void;
}

function InvoiceFormModalContent({ onClose }: InvoiceFormModalProps) {
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [isPending, startTransition] = useTransition();
  const [orders, setOrders] = React.useState<Order[]>([]);
  const router = useRouter();
  const { editingCustomer, lookupCustomers, isInvoiceFormModalOpen } =
    useUIStore();

  const getData = async () => {
    startTransition(async () => {
      const res = await getOrdersAction({
        query: {
          isInvoice: true,
          paymentStatus: PaymentStatus.UNPAID,
          customerId: Number(editingCustomer?.customerId),
        },
      });

      if (res && res.success) {
        setOrders(res.data.rows);
      }
    });
  };

  React.useEffect(() => {
    if (isInvoiceFormModalOpen) {
      getData();
    }
  }, [isInvoiceFormModalOpen]);

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(InvoiceSchema),
    defaultValues: {
      customerId: Number(editingCustomer?.customerId),
      dateIssued: new Date(),
      dueDate: new Date(new Date().getTime() + 7),
      status: InvoiceStatus.UNPAID,
      items: [],
    },
  });

  React.useEffect(() => {
    const selectedOrderIds = Object.keys(rowSelection)
      .filter((id) => rowSelection[id])
      .map(Number);

    form.setValue("items", selectedOrderIds, {
      shouldValidate: selectedOrderIds.length > 0 || form.formState.isSubmitted,
    });
  }, [rowSelection, form.setValue, form.formState.isSubmitted]);

  const totalAmount = React.useMemo(() => {
    return orders.reduce((acc, order) => {
      if (rowSelection[order.orderId]) {
        acc += order.totalAmount;
      }
      return acc;
    }, 0);
  }, [orders, rowSelection]);

  const {
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = form;
  console.log(errors);

  const handleSave = (data: InvoiceFormData) => {
    startTransition(async () => {
      try {
        const res = await createInvoiceAction(data);
        if (!res || !res.success) {
          throw new Error(res?.error || "Failed to create invoice");
        }

        toast.add({
          type: "success",
          description: "Invoice created successfully",
        });
        onClose();
        router.push(`/invoices/${res?.data?.invoiceId}`);
      } catch (error: any) {
        toast.add({
          type: "error",
          description: error.message || "Failed to create invoice",
        });
      }
    });
  };
  const columnHelper = createColumnHelper<Order>();

  const columns = React.useMemo(
    () =>
      [
        columnHelper.display({
          id: "actions",
          header: ({ table }) => {
            const isAllSelected = table.getIsAllRowsSelected();
            const isSomeSelected = table.getIsSomeRowsSelected();
            return (
              <Checkbox
                checked={isAllSelected || isSomeSelected}
                onCheckedChange={(value) =>
                  table.toggleAllRowsSelected(!!value)
                }
                aria-label="Select all"
              />
            );
          },
          cell: ({ row }) => (
            <Checkbox
              checked={row.getIsSelected()}
              disabled={!row.getCanSelect()}
              onCheckedChange={row.getToggleSelectedHandler()}
            />
          ),
        }),

        columnHelper.accessor("orderId", {
          header: "Order ID",
          cell: (info) => <MonoText>#{info.getValue()}</MonoText>,
        }),

        columnHelper.accessor("createdAt", {
          header: ({ column }) => {
            return <ColumnSort column={column}>Date Ordered</ColumnSort>;
          },
          cell: (info) => (
            <MonoText>{formatDateTime(info.getValue())}</MonoText>
          ),
        }),
        columnHelper.accessor("status", {
          header: ({ column }) => {
            return <ColumnSort column={column}>Status</ColumnSort>;
          },
          cell: (info) => (
            <ColorBadge colorMap={ORDER_STATUS_BADGE_COLOR}>
              {info.getValue()}
            </ColorBadge>
          ),
        }),
        columnHelper.accessor("paymentStatus", {
          header: ({ column }) => {
            return <ColumnSort column={column}>Payment Status</ColumnSort>;
          },
          cell: (info) => (
            <div className="space-x-1">
              <ColorBadge colorMap={PAYMENT_STATUS_BADGE_COLOR}>
                {info.getValue()}
              </ColorBadge>
              {info.getValue() === PaymentStatus.PAID && (
                <ColorBadge colorMap={PAYMENT_METHOD_BADGE_COLOR}>
                  {info.row.original.paymentMethod}
                </ColorBadge>
              )}
            </div>
          ),
        }),

        columnHelper.accessor("totalAmount", {
          header: ({ column }) => {
            return <ColumnSort column={column}>Total Amount</ColumnSort>;
          },
          meta: {
            align: "right",
          },
          cell: (info) => (
            <span className="font-mono font-semibold text-primary flex justify-end">
              {formatCurrency(info.getValue())}
            </span>
          ),
        }),
      ].filter(Boolean) as any[],
    [],
  );

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex flex-row gap-3 font-semibold text-primary">
          Create Invoice
        </DialogTitle>
        <DialogDescription>
          Create invoice for{" "}
          <span className="font-bold text-accent-foreground">
            {editingCustomer?.name}
          </span>
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit(handleSave)} className="space-y-4">
        <Controller
          name="dateIssued"
          control={control}
          render={({ field }) => (
            <Field>
              <FieldLabel>Date Issued</FieldLabel>
              <Popover>
                <PopoverTrigger
                  render={
                    <Button
                      variant={"outline"}
                      data-empty={!field.value}
                      className="justify-between text-left font-normal data-[empty=true]:text-muted-foreground"
                    >
                      {field.value ? (
                        formatDate(field.value)
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <ChevronDownIcon data-icon="inline-end" />
                    </Button>
                  }
                />
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value ? new Date(field.value) : undefined}
                    onSelect={field.onChange}
                    defaultMonth={
                      field.value ? new Date(field.value) : undefined
                    }
                  />
                </PopoverContent>
              </Popover>
              <FieldError>{errors.dateIssued?.message}</FieldError>
            </Field>
          )}
        />

        <motion.div
          className="flex flex-col gap-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Field>
            <DataTable
              columns={columns}
              data={orders}
              emptyMessage="No orders found."
              rowSelection={rowSelection}
              onRowSelectionChange={setRowSelection}
              getRowId={(row) => String(row.orderId)}
            />
            <FieldError>{errors.items?.message}</FieldError>
          </Field>
          <div className="flex flex-row justify-end gap-2 pr-4">
            <p>Total:</p>
            <p className="font-bold text-primary">
              {formatCurrency(totalAmount)}
            </p>
          </div>
        </motion.div>

        <DialogFooter className="pt-4">
          <Button type="button" onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && (
              <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"></span>
            )}
            {isPending ? "Logging..." : "Create Invoice"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

export function InvoiceFormModal() {
  const { isInvoiceFormModalOpen, setInvoiceFormModalOpen } = useUIStore();

  if (!isInvoiceFormModalOpen) return null;

  return (
    <Modal
      maxWidth="md"
      isOpen={isInvoiceFormModalOpen}
      onClose={() => setInvoiceFormModalOpen(false, null)}
    >
      <InvoiceFormModalContent
        onClose={() => setInvoiceFormModalOpen(false, null)}
      />
    </Modal>
  );
}

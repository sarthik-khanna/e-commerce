"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import type { OrderStatus } from "@/generated/prisma/enums";
import { refundOrderAction, updateOrderStatusAction } from "@/actions/orders";
import { SubmitButton } from "@/components/submit-button";
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
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFormAction } from "@/hooks/use-form-action";

const NEXT: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};
const cap = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

export function OrderStatusForm({ orderId, status, paid }: { orderId: string; status: OrderStatus; paid: boolean }) {
  // Unpaid orders can only be cancelled; paid ones move forward through fulfilment.
  const options = NEXT[status].filter((s) => (paid ? s !== "CANCELLED" : s === "CANCELLED"));
  const [next, setNext] = useState<string | null>(options[0] ?? null);
  const { state, onSubmit, pending } = useFormAction(updateOrderStatusAction, {});

  useEffect(() => {
    if (!state.message) return;
    if (state.ok) toast.success(state.message);
    else toast.error(state.message);
  }, [state]);

  if (options.length === 0) {
    return <p className="text-sm text-muted-foreground">No further status changes available.</p>;
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap gap-2">
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="status" value={next ?? ""} />
      <Select value={next} onValueChange={(v) => setNext(v as string)} items={options.map((o) => ({ value: o, label: cap(o) }))}>
        <SelectTrigger className="w-40" aria-label="New status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {cap(o)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <SubmitButton pending={pending} disabled={!next}>Update status</SubmitButton>
    </form>
  );
}

export function RefundButton({ orderId, amount }: { orderId: string; amount: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="destructive" />}>Refund & cancel</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Refund {amount} and cancel this order?</AlertDialogTitle>
          <AlertDialogDescription>
            A full refund is issued through Razorpay, stock is returned to inventory and the customer is emailed. This
            cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep order</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await refundOrderAction(orderId);
                if (res.ok) toast.success(res.message);
                else toast.error(res.message);
                setOpen(false);
              })
            }
          >
            Issue refund
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

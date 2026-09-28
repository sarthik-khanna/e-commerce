"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArchiveIcon, ArchiveRestoreIcon, ExternalLinkIcon, MoreHorizontalIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { deleteProductAction, toggleProductActiveAction } from "@/actions/products";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ProductRowActions({
  product,
  canDelete,
}: {
  product: { id: string; slug: string; name: string; isActive: boolean };
  canDelete: boolean;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${product.name}`} />}>
          <MoreHorizontalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem render={<Link href={`/admin/products/${product.id}`} />}>
            <PencilIcon /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem render={<a href={`/products/${product.slug}`} target="_blank" rel="noreferrer" />}>
            <ExternalLinkIcon /> View in store
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await toggleProductActiveAction(product.id);
                toast.success(product.isActive ? "Product archived" : "Product activated");
              })
            }
          >
            {product.isActive ? <ArchiveIcon /> : <ArchiveRestoreIcon />}
            {product.isActive ? "Archive" : "Activate"}
          </DropdownMenuItem>
          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setConfirmOpen(true)}>
                <Trash2Icon /> Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{product.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the product and its images. Past orders keep their snapshot of the item. Consider
              archiving instead if you may sell it again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const res = await deleteProductAction(product.id);
                  if (res.ok) toast.success(res.message);
                  else toast.error(res.message);
                  setConfirmOpen(false);
                })
              }
            >
              Delete product
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

"use client";

import { useEffect, useState, useTransition } from "react";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { deleteCategoryAction, saveCategoryAction } from "@/actions/categories";
import { Field } from "@/components/field";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useFormAction } from "@/hooks/use-form-action";

type CategoryValues = { id: string; name: string; description: string | null };

export function CategoryDialog({ category }: { category?: CategoryValues }) {
  const [open, setOpen] = useState(false);
  const { state, onSubmit, pending } = useFormAction(saveCategoryAction, {});

  useEffect(() => {
    if (state.ok) {
      toast.success(state.message);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- close after a successful save
      setOpen(false);
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          category ? (
            <Button variant="ghost" size="icon-sm" aria-label={`Edit ${category.name}`} />
          ) : (
            <Button />
          )
        }
      >
        {category ? <PencilIcon /> : <><PlusIcon /> New category</>}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{category ? "Edit category" : "New category"}</DialogTitle>
            <DialogDescription>Categories group products in the storefront and in reports.</DialogDescription>
          </DialogHeader>
          {category && <input type="hidden" name="id" value={category.id} />}
          <Field label="Name" htmlFor="cat-name" error={state.fieldErrors?.name}>
            <Input id="cat-name" name="name" defaultValue={category?.name} required />
          </Field>
          <Field label="Description" htmlFor="cat-description" error={state.fieldErrors?.description}>
            <Textarea id="cat-description" name="description" rows={3} defaultValue={category?.description ?? ""} />
          </Field>
          {state.message && !state.ok && <p className="text-sm text-destructive">{state.message}</p>}
          <DialogFooter>
            <SubmitButton pending={pending}>{category ? "Save" : "Create"}</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteCategoryButton({ id, name }: { id: string; name: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={`Delete ${name}`}
      disabled={pending}
      onClick={() => {
        if (!confirm(`Delete the category “${name}”?`)) return;
        startTransition(async () => {
          const res = await deleteCategoryAction(id);
          if (res.ok) toast.success(res.message);
          else toast.error(res.message);
        });
      }}
    >
      <Trash2Icon />
    </Button>
  );
}

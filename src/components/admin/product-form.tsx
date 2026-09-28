"use client";

import Link from "next/link";
import { useState } from "react";
import { saveProductAction } from "@/actions/products";
import { ImageUploader, type UploadedImage } from "@/components/admin/image-uploader";
import { Field } from "@/components/field";
import { SubmitButton } from "@/components/submit-button";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useFormAction } from "@/hooks/use-form-action";
import { slugify } from "@/lib/format";

export type ProductFormValues = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  sku: string;
  price: string; // rupees
  compareAtPrice: string; // rupees
  stock: string;
  categoryId: string;
  isActive: boolean;
  isFeatured: boolean;
  images: UploadedImage[];
};

export function ProductForm({
  initial,
  categories,
}: {
  initial: ProductFormValues;
  categories: { id: string; name: string }[];
}) {
  const { state, onSubmit, pending } = useFormAction(saveProductAction, {});
  const [name, setName] = useState(initial.name);
  const [slug, setSlug] = useState(initial.slug);
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.id));
  const [categoryId, setCategoryId] = useState(initial.categoryId);
  const [isActive, setIsActive] = useState(initial.isActive);
  const [isFeatured, setIsFeatured] = useState(initial.isFeatured);
  const [images, setImages] = useState<UploadedImage[]>(initial.images);
  const errors = state.fieldErrors ?? {};

  return (
    <form onSubmit={onSubmit} className="grid gap-6 xl:grid-cols-[1fr_340px]">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="images" value={JSON.stringify(images)} />
      <input type="hidden" name="categoryId" value={categoryId} />
      <input type="hidden" name="isActive" value={String(isActive)} />
      <input type="hidden" name="isFeatured" value={String(isFeatured)} />

      <div className="grid gap-6">
        {state.message && !state.ok && (
          <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{state.message}</p>
        )}
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Field label="Name" htmlFor="name" error={errors.name}>
              <Input
                id="name"
                name="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!slugTouched) setSlug(slugify(e.target.value));
                }}
                required
              />
            </Field>
            <Field label="URL slug" htmlFor="slug" error={errors.slug} hint={`/products/${slug || "your-product"}`}>
              <Input
                id="slug"
                name="slug"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(slugify(e.target.value));
                }}
                required
              />
            </Field>
            <Field label="Description" htmlFor="description" error={errors.description}>
              <Textarea id="description" name="description" rows={6} defaultValue={initial.description} required />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Images</CardTitle>
            <CardDescription>Uploaded to Cloudinary and served optimized via next/image.</CardDescription>
          </CardHeader>
          <CardContent>
            <ImageUploader value={images} onChange={setImages} />
            {errors.images && <p className="mt-2 text-xs text-destructive">{errors.images[0]}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pricing & inventory</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Price (₹)" htmlFor="price" error={errors.price}>
              <Input id="price" name="price" type="number" step="0.01" min="0" defaultValue={initial.price} required />
            </Field>
            <Field label="Compare-at price / MRP (₹)" htmlFor="compareAtPrice" error={errors.compareAtPrice} hint="Optional — shown struck through">
              <Input id="compareAtPrice" name="compareAtPrice" type="number" step="0.01" min="0" defaultValue={initial.compareAtPrice} />
            </Field>
            <Field label="SKU" htmlFor="sku" error={errors.sku}>
              <Input id="sku" name="sku" defaultValue={initial.sku} className="uppercase" required />
            </Field>
            <Field label="Stock quantity" htmlFor="stock" error={errors.stock}>
              <Input id="stock" name="stock" type="number" min="0" step="1" defaultValue={initial.stock} required />
            </Field>
          </CardContent>
        </Card>
      </div>

      <div className="grid h-fit gap-6 xl:sticky xl:top-20">
        <Card>
          <CardHeader>
            <CardTitle>Organization</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5">
            <Field label="Category" htmlFor="category" error={errors.categoryId}>
              <Select
                value={categoryId || null}
                onValueChange={(v) => setCategoryId(String(v ?? ""))}
                items={categories.map((c) => ({ value: c.id, label: c.name }))}
              >
                <SelectTrigger id="category" className="w-full">
                  <SelectValue placeholder="Choose a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="isActive">Active</Label>
                <p className="text-xs text-muted-foreground">Visible in the storefront</p>
              </div>
              <Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="isFeatured">Featured</Label>
                <p className="text-xs text-muted-foreground">Shown on the home page</p>
              </div>
              <Switch id="isFeatured" checked={isFeatured} onCheckedChange={setIsFeatured} />
            </div>
          </CardContent>
        </Card>
        <div className="flex gap-2">
          <Link href="/admin/products" className={buttonVariants({ variant: "outline", className: "flex-1" })}>
            Cancel
          </Link>
          <SubmitButton className="flex-1" pending={pending}>{initial.id ? "Save changes" : "Create product"}</SubmitButton>
        </div>
      </div>
    </form>
  );
}

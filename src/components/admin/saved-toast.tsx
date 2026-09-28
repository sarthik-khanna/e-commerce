"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

/** Shows a toast after a redirect with ?saved=1, then removes the flag from the URL. */
export function SavedToast({ message }: { message: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (params.get("saved") !== "1") return;
    toast.success(message);
    const next = new URLSearchParams(params);
    next.delete("saved");
    router.replace(next.size ? `${pathname}?${next}` : pathname, { scroll: false });
  }, [params, router, pathname, message]);

  return null;
}

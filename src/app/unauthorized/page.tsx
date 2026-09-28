import Link from "next/link";
import { ShieldAlertIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export const metadata = { title: "Access denied" };

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <ShieldAlertIcon className="size-12 text-destructive" />
      <h1 className="text-2xl font-semibold">You don&apos;t have access to this page</h1>
      <p className="max-w-sm text-muted-foreground">
        Your account role doesn&apos;t include permission for this area. Contact an administrator if you think this
        is a mistake.
      </p>
      <Link href="/" className={buttonVariants()}>
        Back to store
      </Link>
    </div>
  );
}

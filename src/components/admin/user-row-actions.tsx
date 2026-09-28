"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import type { Role } from "@/generated/prisma/enums";
import { toggleUserActiveAction, updateUserRoleAction } from "@/actions/users";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ROLES: { value: Role; label: string }[] = [
  { value: "ADMIN", label: "Admin" },
  { value: "MANAGER", label: "Manager" },
  { value: "CUSTOMER", label: "Customer" },
];

export function UserRowActions({ userId, role, isActive, isSelf }: { userId: string; role: Role; isActive: boolean; isSelf: boolean }) {
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<{ ok?: boolean; message?: string }>) =>
    startTransition(async () => {
      const res = await fn();
      if (res.ok) toast.success(res.message);
      else toast.error(res.message);
    });

  if (isSelf) return <span className="text-xs text-muted-foreground">This is you</span>;

  return (
    <div className="flex items-center justify-end gap-2">
      <Select
        value={role}
        items={ROLES}
        disabled={pending}
        onValueChange={(next) => next && next !== role && run(() => updateUserRoleAction(userId, String(next)))}
      >
        <SelectTrigger size="sm" className="w-32" aria-label="Role">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ROLES.map((r) => (
            <SelectItem key={r.value} value={r.value}>
              {r.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="sm"
        variant={isActive ? "outline" : "secondary"}
        disabled={pending}
        onClick={() => run(() => toggleUserActiveAction(userId))}
      >
        {isActive ? "Deactivate" : "Activate"}
      </Button>
    </div>
  );
}

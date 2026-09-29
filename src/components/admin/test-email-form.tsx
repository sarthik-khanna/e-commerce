"use client";

import { useActionState } from "react";
import { CircleAlertIcon, CircleCheckIcon, SendIcon } from "lucide-react";
import { sendTestEmailAction, type TestEmailState } from "@/actions/integrations";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";

export function TestEmailForm({ defaultTo }: { defaultTo: string }) {
  const [state, action, pending] = useActionState<TestEmailState, FormData>(sendTestEmailAction, {});

  return (
    <div className="space-y-3">
      <form action={action} className="flex flex-wrap gap-2">
        <Input
          name="to"
          type="email"
          required
          defaultValue={defaultTo}
          placeholder="you@example.com"
          aria-label="Send test email to"
          className="w-full sm:w-72"
        />
        <SubmitButton pending={pending}>
          <SendIcon /> Send test email
        </SubmitButton>
      </form>
      {state.message && (
        <div
          role="status"
          className={
            state.ok
              ? "flex gap-2 rounded-md bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400"
              : "flex gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive"
          }
        >
          {state.ok ? <CircleCheckIcon className="mt-0.5 size-4 shrink-0" /> : <CircleAlertIcon className="mt-0.5 size-4 shrink-0" />}
          <div className="space-y-1">
            <p className="font-medium">{state.message}</p>
            {state.hint && <p>How to fix: {state.hint}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

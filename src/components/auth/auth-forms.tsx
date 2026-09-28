"use client";

import Link from "next/link";
import { CheckCircle2Icon } from "lucide-react";
import {
  forgotPasswordAction,
  googleSignInAction,
  loginAction,
  registerAction,
  resetPasswordAction,
} from "@/actions/auth";
import { Field } from "@/components/field";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useFormAction } from "@/hooks/use-form-action";
import type { ActionState } from "@/lib/validations";

function FormMessage({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return (
    <p
      role="alert"
      className={
        state.ok
          ? "flex items-start gap-2 rounded-md bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400"
          : "rounded-md bg-destructive/10 p-3 text-sm text-destructive"
      }
    >
      {state.ok && <CheckCircle2Icon className="mt-0.5 size-4 shrink-0" />}
      {state.message}
    </p>
  );
}

function GoogleButton({ callbackUrl }: { callbackUrl: string }) {
  return (
    <form action={googleSignInAction}>
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <Button type="submit" variant="outline" className="w-full">
        <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
          <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.3 12 2.3 6.7 2.3 2.4 6.6 2.4 12s4.3 9.7 9.6 9.7c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z" />
        </svg>
        Continue with Google
      </Button>
    </form>
  );
}

export function LoginForm({ callbackUrl, googleEnabled, error }: { callbackUrl: string; googleEnabled: boolean; error?: string }) {
  const { state, onSubmit, pending } = useFormAction(loginAction, {
    message: error ? "Sign-in failed. Please try again or use another method." : undefined,
  });

  return (
    <div className="grid gap-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Sign in to your account to continue.</p>
      </div>
      <FormMessage state={state} />
      <form onSubmit={onSubmit} className="grid gap-4">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <Field label="Email" htmlFor="email" error={state.fieldErrors?.email}>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Password" htmlFor="password" error={state.fieldErrors?.password}>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </Field>
        <div className="-mt-2 text-right">
          <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">
            Forgot password?
          </Link>
        </div>
        <SubmitButton className="w-full" pending={pending}>Sign in</SubmitButton>
      </form>
      {googleEnabled && (
        <>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <Separator className="flex-1" /> OR <Separator className="flex-1" />
          </div>
          <GoogleButton callbackUrl={callbackUrl} />
        </>
      )}
      <p className="text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link href="/register" className="font-medium text-foreground underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}

export function RegisterForm({ googleEnabled }: { googleEnabled: boolean }) {
  const { state, onSubmit, pending } = useFormAction(registerAction, {});
  return (
    <div className="grid gap-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
        <p className="text-sm text-muted-foreground">Shop faster and track your orders.</p>
      </div>
      <FormMessage state={state} />
      <form onSubmit={onSubmit} className="grid gap-4">
        <Field label="Full name" htmlFor="name" error={state.fieldErrors?.name}>
          <Input id="name" name="name" autoComplete="name" required />
        </Field>
        <Field label="Email" htmlFor="email" error={state.fieldErrors?.email}>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Password" htmlFor="password" error={state.fieldErrors?.password} hint="At least 8 characters with a letter and a number">
          <Input id="password" name="password" type="password" autoComplete="new-password" required />
        </Field>
        <Field label="Confirm password" htmlFor="confirmPassword" error={state.fieldErrors?.confirmPassword}>
          <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required />
        </Field>
        <SubmitButton className="w-full" pending={pending}>Create account</SubmitButton>
      </form>
      {googleEnabled && <GoogleButton callbackUrl="/" />}
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

export function ForgotPasswordForm() {
  const { state, onSubmit, pending } = useFormAction(forgotPasswordAction, {});
  return (
    <div className="grid gap-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Forgot your password?</h1>
        <p className="text-sm text-muted-foreground">We&apos;ll email you a link to reset it.</p>
      </div>
      <FormMessage state={state} />
      {!state.ok && (
        <form onSubmit={onSubmit} className="grid gap-4">
          <Field label="Email" htmlFor="email" error={state.fieldErrors?.email}>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </Field>
          <SubmitButton className="w-full" pending={pending}>Send reset link</SubmitButton>
        </form>
      )}
      <Link href="/login" className="text-center text-sm text-muted-foreground hover:text-foreground">
        ← Back to sign in
      </Link>
    </div>
  );
}

export function ResetPasswordForm({ token, email }: { token: string; email: string }) {
  const { state, onSubmit, pending } = useFormAction(resetPasswordAction, {});
  return (
    <div className="grid gap-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
        <p className="text-sm text-muted-foreground">For {email}</p>
      </div>
      <FormMessage state={state} />
      {state.ok ? (
        <Link href="/login" className="text-center text-sm font-medium text-primary hover:underline">
          Continue to sign in →
        </Link>
      ) : (
        <form onSubmit={onSubmit} className="grid gap-4">
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="email" value={email} />
          <Field label="New password" htmlFor="password" error={state.fieldErrors?.password}>
            <Input id="password" name="password" type="password" autoComplete="new-password" required />
          </Field>
          <Field label="Confirm password" htmlFor="confirmPassword" error={state.fieldErrors?.confirmPassword}>
            <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required />
          </Field>
          <SubmitButton className="w-full" pending={pending}>Update password</SubmitButton>
        </form>
      )}
    </div>
  );
}

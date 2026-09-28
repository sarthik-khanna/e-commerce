import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/auth-forms";
import { features } from "@/lib/env";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage(props: PageProps<"/login">) {
  const sp = await props.searchParams;
  const callbackUrl = typeof sp.callbackUrl === "string" ? sp.callbackUrl : "/";
  const error = typeof sp.error === "string" ? sp.error : undefined;
  return <LoginForm callbackUrl={callbackUrl} googleEnabled={features.google} error={error} />;
}

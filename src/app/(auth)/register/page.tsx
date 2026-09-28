import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/auth-forms";
import { features } from "@/lib/env";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return <RegisterForm googleEnabled={features.google} />;
}

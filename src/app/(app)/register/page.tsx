import type { Metadata } from "next";
import { RegisterView } from "@/features/register/register-view";

export const metadata: Metadata = { title: "Assignment Register" };

export default function RegisterPage() {
  return <RegisterView />;
}

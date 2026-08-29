import Link from "next/link";
import { signIn } from "@/app/auth/actions";
import { AuthForm } from "@/components/AuthForm";

export const dynamic = "force-dynamic";

export default function SignInPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-6">
      <h1 className="mb-1 text-2xl font-semibold text-neutral-900">Welcome back</h1>
      <p className="mb-6 text-sm text-neutral-500">Sign in to Done.</p>
      <AuthForm mode="sign-in" action={signIn} />
      <p className="mt-6 text-center text-sm text-neutral-500">
        No account?{" "}
        <Link href="/sign-up" className="font-medium text-neutral-900 underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}

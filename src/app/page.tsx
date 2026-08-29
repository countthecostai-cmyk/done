import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-24 text-center">
      <h1 className="text-5xl font-bold tracking-tight text-neutral-900">
        Need something done?
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-lg text-neutral-600">
        There&apos;s a Doer for that. Labor, errands, and on-demand personal
        tasks — request it, get matched, get it done.
      </p>
      <div className="mt-8 flex justify-center gap-4">
        <Link
          href="/request/new"
          className="rounded-lg bg-neutral-900 px-6 py-3 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Request a task
        </Link>
        <a
          href={process.env.NEXT_PUBLIC_DOER_APP_URL ?? "#"}
          className="rounded-lg border border-neutral-300 px-6 py-3 text-sm font-medium text-neutral-900 hover:bg-neutral-100"
        >
          Become a Doer
        </a>
      </div>
    </div>
  );
}

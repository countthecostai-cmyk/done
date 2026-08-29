"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function applyToBeDoer(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const bio = String(formData.get("bio") ?? "").slice(0, 2000);

  const { error } = await supabase.from("doer_profiles").insert({
    user_id: user.id,
    bio: bio || null,
  });
  if (error) {
    if (error.code === "23505") return { error: "You've already applied." };
    return { error: error.message };
  }

  revalidatePath("/doer/apply");
  revalidatePath("/dashboard");
  return {};
}

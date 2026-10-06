import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return NextResponse.json(
      {
        ok: false,
        configured: false,
        message: "Supabase environment variables are not configured.",
      },
      { status: 503 },
    );
  }

  const { error } = await supabase.from("businesses").select("id").limit(1);

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        configured: true,
        message: error.message,
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    ok: true,
    configured: true,
    message: "Supabase connection is available.",
  });
}

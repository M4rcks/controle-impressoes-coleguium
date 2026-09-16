import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { error } = await getSupabaseAdmin().from("print_records").delete().eq("id", Number(id));
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) { console.error(error); return NextResponse.json({ error: "Não foi possível excluir o registro." }, { status: 500 }); }
}

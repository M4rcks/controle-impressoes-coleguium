import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
const fromRow = (row: Record<string, unknown>) => ({ id: row.id, printDate: row.print_date, requester: row.requester, sector: row.sector, segment: row.segment, material: row.material, pageSize: row.page_size, pagesPerCopy: row.pages_per_copy, copies: row.copies, printMode: row.print_mode, printedFaces: row.printed_faces, sheetsUsed: row.sheets_used, authorized: row.authorized, operator: row.operator, notes: row.notes, createdAt: row.created_at });

export async function GET() {
  try {
    const { data, error } = await getSupabaseAdmin().from("print_records").select("*").order("print_date", { ascending: false }).order("id", { ascending: false });
    if (error) throw error;
    return NextResponse.json((data || []).map(fromRow));
  } catch (error) { console.error(error); return NextResponse.json({ error: "Não foi possível carregar os registros." }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json(); const pages = Number(body.pagesPerCopy); const copies = Number(body.copies);
    if (!body.printDate || !body.requester || !body.material || !body.operator || pages < 1 || copies < 1) return NextResponse.json({ error: "Preencha todos os campos obrigatórios." }, { status: 400 });
    const record = { print_date: body.printDate, requester: String(body.requester).trim(), sector: body.sector, segment: body.segment, material: String(body.material).trim(), page_size: body.pageSize, pages_per_copy: pages, copies, print_mode: body.printMode, printed_faces: pages * copies, sheets_used: (body.printMode === "duplex" ? Math.ceil(pages / 2) : pages) * copies, authorized: Boolean(body.authorized), operator: body.operator, notes: String(body.notes || "").trim() };
    const { data, error } = await getSupabaseAdmin().from("print_records").insert(record).select().single();
    if (error) throw error;
    return NextResponse.json(fromRow(data), { status: 201 });
  } catch (error) { console.error(error); return NextResponse.json({ error: "Não foi possível salvar o registro." }, { status: 500 }); }
}

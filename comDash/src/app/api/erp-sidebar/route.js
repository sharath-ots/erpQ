import { NextResponse } from "next/server";

/** ERP sidebar proxy disabled until ERP iframe integration is wired. */
export async function GET() {
  return NextResponse.json({ message: [] });
}

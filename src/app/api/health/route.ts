import { mongoDb } from "@/lib/mongo";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await mongoDb.command({ ping: 1 });
    return Response.json({ status: "ok" });
  } catch {
    return Response.json({ status: "error", db: "unreachable" }, { status: 503 });
  }
}

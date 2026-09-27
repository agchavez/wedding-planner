export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { bootstrapAdmin } = await import("@/lib/bootstrap");
  await bootstrapAdmin().catch((err) => console.error("[bootstrap] No se pudo crear el administrador inicial:", err));
}

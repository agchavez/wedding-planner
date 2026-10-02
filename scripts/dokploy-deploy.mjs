#!/usr/bin/env node
// Fija una imagen en la aplicación de Dokploy y la despliega; espera a que el despliegue termine.
//   node scripts/dokploy-deploy.mjs ghcr.io/agchavez/wedding-planner:sha-<commit>
// Variables: DOKPLOY_URL (sin /api al final), DOKPLOY_API_KEY, DOKPLOY_APP_ID. Sin dependencias.

const POLL_MS = 5_000;
const TIMEOUT_MS = 10 * 60_000;

const image = process.argv[2];
const { DOKPLOY_URL, DOKPLOY_API_KEY, DOKPLOY_APP_ID: appId } = process.env;
const missing = ["DOKPLOY_URL", "DOKPLOY_API_KEY", "DOKPLOY_APP_ID"].filter((n) => !process.env[n]?.trim());
if (!image || missing.length > 0) {
  console.error(`Uso: node scripts/dokploy-deploy.mjs <imagen>. Faltan: ${missing.join(", ") || "imagen"}`);
  process.exit(1);
}
const base = DOKPLOY_URL.trim().replace(/\/+$/, "");
const redact = (t) => String(t).split(DOKPLOY_API_KEY).join("***");

async function call(route, { method = "GET", query, body } = {}) {
  const url = new URL(`${base}/api/${route}`);
  for (const [k, v] of Object.entries(query ?? {})) url.searchParams.set(k, v);
  const res = await fetch(url, {
    method,
    headers: {
      accept: "application/json",
      "x-api-key": DOKPLOY_API_KEY,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Dokploy ${route} respondió ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : undefined;
}

async function latest() {
  const list = await call("deployment.all", { query: { applicationId: appId } });
  if (!Array.isArray(list)) throw new Error("deployment.all no devolvió una lista");
  return [...list].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0];
}

try {
  const before = (await latest())?.deploymentId;
  await call("application.update", { method: "POST", body: { applicationId: appId, dockerImage: image } });
  console.log(`Imagen de ${appId} -> ${image}`);
  await call("application.deploy", { method: "POST", body: { applicationId: appId } });
  const deadline = Date.now() + TIMEOUT_MS;
  for (;;) {
    const d = await latest();
    if (d && d.deploymentId !== before) {
      if (d.status === "done") break;
      if (d.status === "error" || d.status === "cancelled") throw new Error(`El despliegue terminó en ${d.status}`);
    }
    if (Date.now() + POLL_MS > deadline) throw new Error("Se agotó el tiempo esperando el despliegue");
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
  console.log("Desplegado.");
} catch (error) {
  console.error(`Error: ${redact(error?.message ?? error)}`);
  process.exit(1);
}

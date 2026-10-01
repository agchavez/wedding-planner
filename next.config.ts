import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // Imagen de Docker mínima: `next build` genera un servidor autocontenido en .next/standalone.
  output: "standalone",
  poweredByHeader: false,
  // El build de Docker corre en el servidor de Dokploy (4 GB compartidos) y el chequeo de tipos
  // agota la memoria de Node; ahí se omite porque el CI ya lo hace con `npm run build`.
  typescript: { ignoreBuildErrors: process.env.SKIP_TYPECHECK === "1" },
  experimental: {
    // Comprobantes (hasta 10 MB) y fotos/videos que se suben a Google Drive van por server
    // actions; el límite por defecto es 1 MB (y 10 MB al pasar por el proxy).
    serverActions: { bodySizeLimit: "25mb" },
    proxyClientMaxBodySize: "25mb",
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;

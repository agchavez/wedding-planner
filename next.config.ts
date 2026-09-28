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

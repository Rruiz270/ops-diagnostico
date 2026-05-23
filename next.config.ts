import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Quando a app for servida via rewrite em institutoi10.com.br/ops-diagnostico/,
  // assetPrefix garante que _next/* aponta sempre pro deploy origem.
  // No deploy direto (ops-diagnostico.vercel.app) também funciona porque
  // assetPrefix com mesmo host é no-op.
  assetPrefix:
    process.env.NEXT_PUBLIC_ASSET_PREFIX || "https://ops-diagnostico.vercel.app",
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;

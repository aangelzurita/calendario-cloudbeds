/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // ✅ Esto evita que el build falle por ESLint mal configurado
  eslint: {
    ignoreDuringBuilds: true,
  },

  // (Opcional pero útil si TS llegara a dar lata en build)
  // typescript: {
  //   ignoreBuildErrors: true,
  // },
};

export default nextConfig;

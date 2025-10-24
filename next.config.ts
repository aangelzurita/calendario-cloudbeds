/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  // Si TypeScript llegara a frenar el build, destapa la siguiente línea:
  // typescript: { ignoreBuildErrors: true },
};

module.exports = nextConfig;

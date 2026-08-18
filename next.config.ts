import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  // Hay otro lockfile más arriba en el árbol de carpetas; sin esto Next.js no sabe
  // cuál es la raíz del proyecto y avisa en cada build.
  outputFileTracingRoot: path.resolve(__dirname),

  // A diferencia de netgym, acá los errores de tipo y de lint SÍ rompen el build.
  // El proyecto se transfiere al cliente: no queremos que se acumulen en silencio.
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // La cámara la usa el lector de QR de la portería y la credencial del socio.
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;

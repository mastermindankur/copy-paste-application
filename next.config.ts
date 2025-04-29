
import type {NextConfig} from 'next';

// Determine the base URL based on Vercel deployment or explicit env var
const getBaseUrl = () => {
  if (process.env.VERCEL_URL) {
    // Vercel provides the deployment URL with https
    return `https://${process.env.VERCEL_URL}`;
  }
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    // Use explicitly set base URL
    return process.env.NEXT_PUBLIC_BASE_URL;
  }
  // Fallback for local development
  return 'http://localhost:9002';
};

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
   env: {
    // Make REDIS_URL available server-side only (default behavior)
    REDIS_URL: process.env.REDIS_URL, // Ensure REDIS_URL is passed
    // Make NEXT_PUBLIC_BASE_URL available client-side
    NEXT_PUBLIC_BASE_URL: getBaseUrl(),
  },
};

export default nextConfig;

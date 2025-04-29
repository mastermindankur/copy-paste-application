
import type {NextConfig} from 'next';

// Determine the base URL based on Vercel deployment or explicit env var
const getBaseUrl = () => {
  // Vercel provides the deployment URL (e.g., project.vercel.app)
  // or a preview URL (e.g., project-git-branch-org.vercel.app)
  // These already include https:// when provided by Vercel automatically
  const vercelUrl = process.env.VERCEL_URL || process.env.VERCEL_BRANCH_URL;
  if (vercelUrl) {
    // Ensure it starts with https://, Vercel usually provides this but better safe.
    const fullVercelUrl = vercelUrl.startsWith('https://') ? vercelUrl : `https://${vercelUrl}`;
    console.log(`Using Vercel deployment URL: ${fullVercelUrl}`);
    return fullVercelUrl;
  }

  // Check for explicitly set NEXT_PUBLIC_BASE_URL environment variable
  const explicitBaseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (explicitBaseUrl) {
    console.log(`Using explicit NEXT_PUBLIC_BASE_URL: ${explicitBaseUrl}`);
    // Validate if it's a proper URL (optional but good practice)
    try {
        new URL(explicitBaseUrl);
    } catch (e) {
        console.error(`Error: Invalid NEXT_PUBLIC_BASE_URL format: ${explicitBaseUrl}. It should be a full URL like https://yourdomain.com`);
        // Fallback if the explicitly set URL is invalid? Or let it potentially fail later?
        // For now, we'll still return it but log the error.
    }
    return explicitBaseUrl;
  }

  // Fallback for local development or unconfigured environments
  const fallbackUrl = 'http://localhost:9002';
  // This warning is crucial for deployment troubleshooting
  console.warn(`Warning: VERCEL_URL and NEXT_PUBLIC_BASE_URL are not set. Falling back to default ${fallbackUrl}. Ensure NEXT_PUBLIC_BASE_URL is configured correctly in your hosting environment for deployments.`);
  return fallbackUrl;
};

const determinedBaseUrl = getBaseUrl();

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
    // Make NEXT_PUBLIC_BASE_URL available server-side and client-side
    NEXT_PUBLIC_BASE_URL: determinedBaseUrl, // Use the determined URL
  },
};

// Log the final determined URL when the config is loaded
console.log(`Base URL determined for Next.js config env: ${determinedBaseUrl}`);

export default nextConfig;

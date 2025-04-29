
import type {NextConfig} from 'next';

// Determine the base URL based on Vercel deployment or explicit env var
const getBaseUrl = () => {
  let source = 'Unknown'; // Track the source of the URL
  let url = '';

  // Vercel provides the deployment URL (e.g., project.vercel.app)
  // or a preview URL (e.g., project-git-branch-org.vercel.app)
  // These already include https:// when provided by Vercel automatically
  // Use NEXT_PUBLIC_VERCEL_URL which is automatically exposed to the browser
  const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL;
  if (vercelUrl) {
    // Ensure it starts with https://, Vercel usually provides this but better safe.
    url = vercelUrl.startsWith('https://') ? vercelUrl : `https://${vercelUrl}`;
    source = 'Vercel (NEXT_PUBLIC_VERCEL_URL)';
    console.log(`getBaseUrl: Using ${source}: ${url}`);
    return { url, source };
  }

  // Check for explicitly set NEXT_PUBLIC_BASE_URL environment variable
  const explicitBaseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (explicitBaseUrl) {
    source = 'Explicit (NEXT_PUBLIC_BASE_URL)';
     // Validate if it's a proper URL
    try {
        new URL(explicitBaseUrl);
        url = explicitBaseUrl;
        console.log(`getBaseUrl: Using ${source}: ${url}`);
    } catch (e) {
        console.error(`getBaseUrl Error: Invalid NEXT_PUBLIC_BASE_URL format: ${explicitBaseUrl}. It must be a full URL (e.g., https://yourdomain.com or http://localhost:9002). Build will continue, but runtime URL generation might fail.`);
        url = ''; // Set to empty string if invalid
        source = 'Invalid Explicit (NEXT_PUBLIC_BASE_URL)';
    }
    return { url, source };
  }

  // Fallback - This case should only happen if neither Vercel nor explicit URL is set.
  // This is an error state for non-Vercel deployments.
  // For local development, NEXT_PUBLIC_BASE_URL should be set in .env.
  source = 'Missing Configuration';
  url = ''; // Default to empty string, forcing configuration
  console.error(`getBaseUrl CRITICAL ERROR: Vercel URL (NEXT_PUBLIC_VERCEL_URL) and explicit base URL (NEXT_PUBLIC_BASE_URL) are both missing. Share URLs will not generate correctly. For local development, set NEXT_PUBLIC_BASE_URL in .env (e.g., http://localhost:9002). For non-Vercel deployments, set NEXT_PUBLIC_BASE_URL in your hosting environment.`);
  return { url, source };
};

const { url: determinedBaseUrl, source: determinedSource } = getBaseUrl();

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
    // Make NEXT_PUBLIC_BASE_URL available server-side and client-side using the determined URL
    // It might be an empty string if configuration is missing, requiring runtime checks.
    NEXT_PUBLIC_BASE_URL: determinedBaseUrl,
  },
};

// Log the final determined URL and its source when the config is loaded
console.log(`Next.js Config: Base URL determined for env.NEXT_PUBLIC_BASE_URL: "${determinedBaseUrl}" (Source: ${determinedSource})`);
if (!determinedBaseUrl && process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_VERCEL_URL) {
    console.error("Next.js Config CRITICAL WARNING: NEXT_PUBLIC_BASE_URL is empty in a production-like environment without Vercel. Share URLs will fail. Set NEXT_PUBLIC_BASE_URL in your hosting environment.");
}


export default nextConfig;



import type {NextConfig} from 'next';

// Determine the base URL based on Vercel deployment or explicit env var
const getBaseUrl = () => {
  let source = 'Unknown'; // Track the source of the URL

  // Vercel provides the deployment URL (e.g., project.vercel.app)
  // or a preview URL (e.g., project-git-branch-org.vercel.app)
  // These already include https:// when provided by Vercel automatically
  // Use NEXT_PUBLIC_VERCEL_URL which is automatically exposed to the browser
  const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL;
  if (vercelUrl) {
    // Ensure it starts with https://, Vercel usually provides this but better safe.
    const fullVercelUrl = vercelUrl.startsWith('https://') ? vercelUrl : `https://${vercelUrl}`;
    source = 'Vercel (NEXT_PUBLIC_VERCEL_URL)';
    console.log(`getBaseUrl: Using ${source}: ${fullVercelUrl}`);
    return { url: fullVercelUrl, source };
  }

  // Check for explicitly set NEXT_PUBLIC_BASE_URL environment variable
  const explicitBaseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (explicitBaseUrl) {
    source = 'Explicit (NEXT_PUBLIC_BASE_URL)';
    console.log(`getBaseUrl: Using ${source}: ${explicitBaseUrl}`);
    // Validate if it's a proper URL (optional but good practice)
    try {
        new URL(explicitBaseUrl);
    } catch (e) {
        console.error(`getBaseUrl Error: Invalid NEXT_PUBLIC_BASE_URL format: ${explicitBaseUrl}. It should be a full URL like https://yourdomain.com`);
        // Decide on behavior for invalid explicit URL: return it, or fallback?
        // Returning it for now, but logging error. Consider fallback if stricter validation needed.
    }
    return { url: explicitBaseUrl, source };
  }

  // Fallback for local development or unconfigured environments
  const fallbackUrl = 'http://localhost:9002';
  source = 'Fallback (localhost)';
  // This warning is crucial for deployment troubleshooting
  console.warn(`getBaseUrl Warning: Vercel URL and NEXT_PUBLIC_BASE_URL are not set. ${source}: ${fallbackUrl}. Ensure NEXT_PUBLIC_BASE_URL is configured correctly in your hosting environment for non-Vercel deployments.`);
  return { url: fallbackUrl, source };
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
    NEXT_PUBLIC_BASE_URL: determinedBaseUrl,
  },
};

// Log the final determined URL and its source when the config is loaded
console.log(`Next.js Config: Base URL determined for env.NEXT_PUBLIC_BASE_URL: ${determinedBaseUrl} (Source: ${determinedSource})`);

export default nextConfig;

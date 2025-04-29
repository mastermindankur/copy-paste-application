
# CrossClip

A simple application to copy paste content easily across multiple devices including files.

## Features

*   **Content Capture:** Capture clipboard content (text, images, files) from the user's current device.
*   **Clipboard History:** Display a list of the user's previously copied items, accessible across devices.
*   **Cross-Device Sync:** Create a unique URL to access and sync clipboard items across different devices. Data is persisted using Redis (e.g., Redis Cloud, Upstash, self-hosted, or Vercel KV which provides a Redis-compatible interface).

## Getting Started

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd crossclip
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    ```

3.  **Set up Environment Variables:**
    *   Copy the `.env.example` file to `.env`.
    *   **Provide your Redis connection URL in the `REDIS_URL` variable.** You can use services like [Redis Cloud](https://redis.com/redis-enterprise-cloud/overview/), [Upstash](https://upstash.com/), or host your own Redis instance. If using Vercel KV, obtain the `REDIS_URL`-compatible connection string from the Vercel dashboard (Storage tab -> KV -> Connect -> Show Secrets -> `.env.local` tab -> `KV_URL`).
    *   **`NEXT_PUBLIC_BASE_URL` Configuration (Important!):**
        *   **For Local Development:** To ensure generated share URLs use `http://localhost:9002` (or your configured port) instead of just `/clip/...`, you **must** set `NEXT_PUBLIC_BASE_URL` in your `.env` file:
            ```dotenv
            NEXT_PUBLIC_BASE_URL=http://localhost:9002
            ```
        *   **For Vercel Deployment:** This is usually detected automatically.
        *   **For Other Hosting:** Set `NEXT_PUBLIC_BASE_URL` to your application's public domain (e.g., `NEXT_PUBLIC_BASE_URL=https://your-app-domain.com`).

4.  **Run the development server:**
    ```bash
    npm run dev
    # or
    yarn dev
    # or
    pnpm dev
    ```

Open [http://localhost:9002](http://localhost:9002) (or your configured port) with your browser to see the result.

## Tech Stack

*   [Next.js](https://nextjs.org/) (App Router)
*   [React](https://reactjs.org/)
*   [TypeScript](https://www.typescriptlang.org/)
*   [Tailwind CSS](https://tailwindcss.com/)
*   [Shadcn/ui](https://ui.shadcn.com/)
*   [Lucide React](https://lucide.dev/) (Icons)
*   [Redis](https://redis.io/) (for data persistence via [`node-redis`](https://github.com/redis/node-redis))
*   [date-fns](https://date-fns.org/) (Date Formatting)

## Deployment

This application is ready to be deployed on platforms like Vercel, Netlify, or any Node.js hosting provider.

*   **Environment Variables:** Ensure `REDIS_URL` is set in your hosting environment. `NEXT_PUBLIC_BASE_URL` should also be set correctly for your deployment domain if not automatically detected (e.g., by Vercel).

## Troubleshooting

*   **Connection Errors:** Double-check your `REDIS_URL` in the `.env` file or environment variables. Ensure the Redis server/service is running and accessible. Check for firewall issues. Make sure the URL format is correct (usually starts with `redis://` or `rediss://`).
*   **URL Generation:**
    *   **Localhost URLs:** If shared URLs are generated as `http://localhost:9002/...` during local development, ensure you have set `NEXT_PUBLIC_BASE_URL=http://localhost:9002` in your `.env` file as described in "Getting Started".
    *   **Incorrect Domain on Deployment:** If shared URLs point to `localhost` or an incorrect domain *after deployment*, verify the `NEXT_PUBLIC_BASE_URL` environment variable is correctly set in your hosting environment's settings. Vercel usually handles this automatically via `VERCEL_URL`, but other platforms might require explicit configuration.
*   Ensure all dependencies are installed correctly (`npm install`).
*   Make sure the development server is running (`npm run dev`).
*   Check the browser's developer console (usually F12) for client-side errors.
*   Check the terminal where `npm run dev` is running for server-side errors.
```
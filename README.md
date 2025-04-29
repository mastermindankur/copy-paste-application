
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
    *   Copy the `.env.example` file to `.env` (if it doesn't exist).
    *   **Provide your Redis connection URL in the `REDIS_URL` variable.** You can use services like [Redis Cloud](https://redis.com/redis-enterprise-cloud/overview/), [Upstash](https://upstash.com/), or host your own Redis instance. If using Vercel KV, obtain the `KV_URL` (Redis-compatible connection string) from the Vercel dashboard (Storage tab -> KV -> Connect -> Show Secrets -> `.env.local` tab -> `KV_URL`). Example format: `rediss://:...` or `redis://...`.
    *   **`NEXT_PUBLIC_BASE_URL` Configuration (Important for Share URLs!):** This variable determines the base URL used when generating shareable links (`/clip/...`).
        *   **Local Development:** Set `NEXT_PUBLIC_BASE_URL` in your `.env` file to your local development address (e.g., `http://localhost:9002`) to ensure share URLs work correctly locally:
            ```dotenv
            # .env
            REDIS_URL=your_redis_connection_string
            NEXT_PUBLIC_BASE_URL=http://localhost:9002
            ```
        *   **Vercel Deployment:** Vercel automatically detects the deployment URL via the `VERCEL_URL` environment variable. You usually **do not** need to set `NEXT_PUBLIC_BASE_URL` manually in Vercel's environment variable settings.
        *   **Other Hosting Providers (Netlify, Docker, etc.):** You **must** explicitly set the `NEXT_PUBLIC_BASE_URL` environment variable in your hosting provider's settings to your application's public domain (e.g., `https://your-app-domain.com`). If you don't set this, generated share URLs will incorrectly point to `http://localhost:9002`.

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

*   **Environment Variables:**
    *   Ensure `REDIS_URL` is set in your hosting environment with the correct connection string for your Redis provider.
    *   Ensure `NEXT_PUBLIC_BASE_URL` is correctly configured for your hosting environment as described in "Getting Started" to ensure share URLs point to the correct domain.

## Troubleshooting

*   **Redis Connection Errors:**
    *   Double-check your `REDIS_URL` in the `.env` file or environment variables.
    *   Ensure the Redis server/service is running and accessible from your application environment.
    *   Check for firewall issues between your app and the Redis host.
    *   Verify the URL format is correct (usually starts with `redis://` or `rediss://`).
    *   Confirm authentication details (password, username if required) are correct within the URL.
*   **Share URL Generation Issues:**
    *   **URLs point to `localhost` on deployed app:** This almost always means `NEXT_PUBLIC_BASE_URL` is not set correctly in your hosting environment variables. Vercel usually handles this automatically, but other platforms (Netlify, Docker, custom servers) require you to set it explicitly to your public domain (e.g., `https://your-app.com`).
    *   **URLs point to `localhost` during local development:** Make sure you have `NEXT_PUBLIC_BASE_URL=http://localhost:9002` (or your port) in your local `.env` file.
*   **General Issues:**
    *   Ensure all dependencies are installed (`npm install`).
    *   Make sure the development server is running (`npm run dev`) or the production build is correctly deployed.
    *   Check the browser's developer console (usually F12) for client-side errors.
    *   Check the terminal/logs where your application is running for server-side errors (especially API route errors).
```
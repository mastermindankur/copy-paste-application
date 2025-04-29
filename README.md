
# CrossClip

A simple application to copy paste content easily across multiple devices including files.

## Features

*   **Content Capture:** Capture clipboard content (text, images, files) from the user's current device.
*   **Clipboard History:** Display a list of the user's previously copied items, accessible across devices.
*   **Cross-Device Sync:** Create a unique URL to access and sync clipboard items across different devices. Data is persisted using Redis.

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
    *   Provide your Redis connection URL in the `REDIS_URL` variable. You can use services like [Redis Cloud](https://redis.com/redis-enterprise-cloud/overview/), [Upstash](https://upstash.com/), or host your own Redis instance. Vercel KV (available under the Storage tab on [Vercel](https://vercel.com/)) is another option that provides a Redis-compatible interface.
    *   The `NEXT_PUBLIC_BASE_URL` is usually detected automatically when deploying to Vercel. For local development or other hosting, set it explicitly (e.g., `NEXT_PUBLIC_BASE_URL=http://localhost:9002`).

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
*   [Redis](https://redis.io/) (for data persistence)
*   [`node-redis`](https://github.com/redis/node-redis) (Redis client)
*   [date-fns](https://date-fns.org/) (Date Formatting)

## Deployment

This application is ready to be deployed on platforms like Vercel, Netlify, or any Node.js hosting provider.

*   **Environment Variables:** Ensure `REDIS_URL` is set in your hosting environment. If using Vercel KV, configure it through the Vercel dashboard. `NEXT_PUBLIC_BASE_URL` should also be set correctly for your deployment domain if not automatically detected (e.g., by Vercel).

## Troubleshooting

*   **Connection Errors:** Double-check your `REDIS_URL` in the `.env` file or environment variables. Ensure the Redis server is running and accessible. Check for firewall issues.
*   **URL Generation:** If shared URLs point to `localhost` after deployment, verify the `NEXT_PUBLIC_BASE_URL` environment variable is correctly set in your hosting environment.
*   Ensure all dependencies are installed correctly (`npm install`).
*   Make sure the development server is running (`npm run dev`).
*   Check the browser's developer console (usually F12) for client-side errors.
*   Check the terminal where `npm run dev` is running for server-side errors.


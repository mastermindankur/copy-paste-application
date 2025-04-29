
# CrossClip

A simple application to copy paste content easily within a browser session.

## Features

*   **Local Clipboard:** Add text, URLs, and rich text (HTML) to a temporary local clipboard history stored in the browser session.
*   **Rich Text Support:** Copy and paste rich text content (HTML) between the app and your system clipboard.
*   **Responsive Design:** Works on various screen sizes.

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

3.  **Run the development server:**
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
*   [date-fns](https://date-fns.org/) (Date Formatting)

## Troubleshooting

*   Ensure all dependencies are installed correctly (`npm install`).
*   Make sure the development server is running (`npm run dev`).
*   Check the browser's developer console (usually F12) for client-side errors.
*   Check the terminal where `npm run dev` is running for server-side errors (though this version has minimal server-side logic).


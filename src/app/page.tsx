import ClipboardManager from '@/components/clipboard-manager';

export default function Home() {
  return (
    <div className="flex flex-col items-center gap-8">
      <h1 className="text-3xl font-semibold text-center">
        CrossClip - Your Local Clipboard
      </h1>
      <p className="text-muted-foreground text-center max-w-md">
        Easily copy text and URLs. Your clipboard history is stored locally in this browser session.
      </p>
      <ClipboardManager />
    </div>
  );
}

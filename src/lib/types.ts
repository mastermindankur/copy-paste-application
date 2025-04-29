
// Defines the structure for a single clipboard item (used locally and in shared collections)
export interface ClipboardItemData {
  id: string; // Unique identifier for the item
  type: 'text' | 'url' | 'html';
  content: string; // Plain text content or URL
  htmlContent?: string; // Optional HTML content
  createdAt: Date | string; // Use Date object for local, string for Redis storage
}

// Defines the structure for a shared clipboard collection stored in Redis
export interface SharedClipCollection {
    id: string;
    items: ClipboardItemData[];
    createdAt: string; // Store as ISO string in Redis
}

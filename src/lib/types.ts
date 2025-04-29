
// Defines the structure for a single clipboard item (used in local UI state)
export interface ClipboardItemData {
  id: string; // Unique identifier for the local item
  type: 'text' | 'url' | 'html';
  content: string; // Plain text content or URL
  htmlContent?: string; // Optional HTML content
  createdAt: Date; // Use Date object for local display formatting
}

// Type declarations for testing environment
interface Window {
  gtag: (command: string, action: string, params: Record<string, unknown>) => void;
}
/// <reference types="vite/client" />

declare interface Window {
  gtag?: (...args: unknown[]) => void;
  dataLayer?: unknown[];
}
/// <reference types="vite/client" />

interface CrushDesktopAPI {
  platform: string;
  isDesktop: boolean;
  pickFolder: () => Promise<string | null>;
}

interface Window {
  crushDesktop?: CrushDesktopAPI;
}

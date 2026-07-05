// Charmtone Pantera theme colors extracted from Crush TUI source
export const pantera = {
  // Backgrounds
  bgBase: '#1e1e1e',        // Pepper
  bgLeastVisible: '#2a2a2a', // BBQ
  bgLessVisible: '#333333',  // Char
  bgMostVisible: '#444444',  // Iron

  // Foregrounds
  fgBase: '#e0e0e0',         // Sash
  fgMoreSubtle: '#999999',   // Squid
  fgSubtle: '#aaaaaa',       // Smoke
  fgMostSubtle: '#666666',   // Oyster

  // Brand
  primary: '#ff5f87',        // Charple (pink-red)
  secondary: '#ffd75f',      // Dolly (gold)
  accent: '#87d787',         // Bok (green)
  keyword: '#ff87af',        // Blush (pink)

  // Status
  error: '#ff5f5f',          // Sriracha
  warning: '#ffd75f',        // Mustard
  success: '#5fd7af',        // Julep
  info: '#5fd7ff',           // Malibu
  busy: '#d7d787',           // Citron
  denied: '#ff875f',         // Tang

  // Separator
  separator: '#333333',      // Char

  // On-primary (text on primary backgrounds)
  onPrimary: '#ffd787',      // Butter
} as const;

export type PanteraColor = keyof typeof pantera;

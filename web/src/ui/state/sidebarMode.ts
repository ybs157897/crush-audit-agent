import type { SidebarMode } from './types';

const STORAGE_KEY = 'crush-web-sidebar-mode';

export function loadSidebarMode(): SidebarMode {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'expanded' || raw === 'rail' || raw === 'hidden') return raw;
  } catch {
    /* ignore */
  }
  return 'expanded';
}

export function saveSidebarMode(mode: SidebarMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

const CYCLE: SidebarMode[] = ['expanded', 'rail', 'hidden'];

export function nextSidebarMode(current: SidebarMode): SidebarMode {
  const idx = CYCLE.indexOf(current);
  return CYCLE[(idx + 1) % CYCLE.length];
}

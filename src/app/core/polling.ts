import { DestroyRef, inject } from '@angular/core';

/**
 * Calls `refresh` every `intervalMs` while the tab is visible, and once when it becomes visible
 * again. Must be called from an injection context; stops when the component is destroyed.
 */
export function pollWhileVisible(refresh: () => void, intervalMs: number): void {
  const isVisible = () => document.visibilityState === 'visible';
  const timer = setInterval(() => {
    if (isVisible()) refresh();
  }, intervalMs);
  const onVisibilityChange = () => {
    if (isVisible()) refresh();
  };
  document.addEventListener('visibilitychange', onVisibilityChange);

  inject(DestroyRef).onDestroy(() => {
    clearInterval(timer);
    document.removeEventListener('visibilitychange', onVisibilityChange);
  });
}

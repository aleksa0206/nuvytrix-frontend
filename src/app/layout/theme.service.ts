import { Service, effect, signal } from '@angular/core';

type ThemeMode = 'dark' | 'light';
const STORAGE_KEY = 'nuvytrix-theme';

@Service()
export class ThemeService {
  readonly mode = signal<ThemeMode>(
    localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark',
  );

  constructor() {
    effect(() => {
      document.documentElement.dataset['theme'] = this.mode();
      localStorage.setItem(STORAGE_KEY, this.mode());
    });
  }

  toggle() {
    this.mode.update((mode) => (mode === 'dark' ? 'light' : 'dark'));
  }
}

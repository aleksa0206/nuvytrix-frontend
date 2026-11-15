import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './layout/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class App {
  // Instantiated at startup so the stored theme applies before the first page renders.
  protected readonly theme = inject(ThemeService);
}

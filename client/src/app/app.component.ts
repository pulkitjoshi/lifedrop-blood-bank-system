import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ThemeService } from './services/theme.service';
import { ToastService } from './services/toast.service';
import { ApiService } from './services/api.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  navItems = [
    { path: 'dashboard', label: 'Dashboard', icon: '▦' },
    { path: 'donors', label: 'Donors', icon: '◈' },
    { path: 'inventory', label: 'Inventory', icon: '▤' },
    { path: 'requests', label: 'Requests', icon: '✉' },
    { path: 'donations', label: 'Donation Log', icon: '↻' },
  ];

  constructor(
    public theme: ThemeService,
    public toast: ToastService,
    private api: ApiService,
  ) {}

  get themeLabel() {
    return this.theme.theme() === 'dark' ? '☀️ Light mode' : '🌙 Dark mode';
  }

  resetData() {
    if (!confirm('This will erase all current data and reload the demo dataset. Continue?')) return;
    this.api.resetDemoData().subscribe({
      next: () => {
        this.toast.show('Demo data reset', 'success');
        location.reload();
      },
      error: () => this.toast.show('Failed to reset demo data', 'error'),
    });
  }
}

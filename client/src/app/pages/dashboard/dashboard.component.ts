import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { BLOOD_GROUPS, DashboardData } from '../../models/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  bloodGroups = BLOOD_GROUPS;
  data = signal<DashboardData | null>(null);

  constructor(private api: ApiService, private toast: ToastService) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.api.getDashboard().subscribe({
      next: (d) => this.data.set(d),
      error: () => this.toast.show('Failed to load dashboard data', 'error'),
    });
  }

  maxUnits(): number {
    const d = this.data();
    if (!d) return 1;
    return Math.max(1, ...Object.values(d.inventory));
  }

  timeAgo(ts: number): string {
    const diff = Math.round((Date.now() - ts) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return Math.floor(diff / 86400) + 'd ago';
  }
}

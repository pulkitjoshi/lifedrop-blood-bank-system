import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { Donation } from '../../models/models';

@Component({
  selector: 'app-donations',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './donations.component.html',
  styleUrl: './donations.component.css',
})
export class DonationsComponent implements OnInit {
  donations = signal<Donation[]>([]);

  constructor(private api: ApiService, private toast: ToastService, private router: Router) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.api.getDonations().subscribe({
      next: (d) => this.donations.set([...d].sort((a, b) => b.date.localeCompare(a.date))),
      error: () => this.toast.show('Failed to load donation log', 'error'),
    });
  }

  goRecordDonation() {
    this.router.navigate(['/inventory']);
  }
}

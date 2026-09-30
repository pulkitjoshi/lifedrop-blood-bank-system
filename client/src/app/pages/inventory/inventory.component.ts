import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { Batch, BLOOD_GROUPS, Donor, Inventory } from '../../models/models';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './inventory.component.html',
  styleUrl: './inventory.component.css',
})
export class InventoryComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private toast = inject(ToastService);

  bloodGroups = BLOOD_GROUPS;
  inventory = signal<Inventory>({});
  batches = signal<Batch[]>([]);
  donors = signal<Donor[]>([]);
  batchFilter = signal('');

  showModal = signal(false);
  formError = signal('');
  today = todayStr();

  form = this.fb.group({
    donorId: ['', Validators.required],
    units: [1, [Validators.required, Validators.min(1), Validators.max(4)]],
    date: [todayStr(), Validators.required],
    center: ['City General Hospital', Validators.required],
  });

  filteredBatches = computed(() => {
    const filter = this.batchFilter();
    const list = [...this.batches()].sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
    return filter ? list.filter((b) => b.bloodGroup === filter) : list;
  });

  statusLabel: Record<string, string> = { fresh: 'Fresh', expiring: 'Expiring Soon', expired: 'Expired' };

  ngOnInit() {
    this.load();
  }

  load() {
    this.api.getInventory().subscribe({ next: (i) => this.inventory.set(i) });
    this.api.getBatches().subscribe({ next: (b) => this.batches.set(b) });
    this.api.getDonors().subscribe({ next: (d) => this.donors.set(d) });
  }

  isLow(group: string): boolean {
    return !!this.inventory()[group]?.low;
  }
  unitsFor(group: string): number {
    return this.inventory()[group]?.units ?? 0;
  }

  openDonationModal() {
    if (this.donors().length === 0) {
      this.toast.show('Add a donor first before recording a donation.', 'error');
      return;
    }
    this.formError.set('');
    this.form.reset({ donorId: this.donors()[0].id, units: 1, date: todayStr(), center: 'City General Hospital' });
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  submit(force = false) {
    if (this.form.invalid) {
      this.formError.set('Please fill in all fields.');
      return;
    }
    const payload = { ...this.form.value, force } as any;
    this.api.addDonation(payload).subscribe({
      next: () => { this.toast.show('Donation recorded', 'success'); this.closeModal(); this.load(); },
      error: (err) => {
        if (err?.status === 409 && err.error?.requiresConfirmation) {
          const donor = this.donors().find((d) => d.id === this.form.value.donorId);
          const proceed = confirm(`${donor?.name} is not yet eligible (donates again in ${err.error.eligibleInDays} day(s)). Record anyway?`);
          if (proceed) this.submit(true);
        } else {
          this.formError.set(err?.error?.error || 'Failed to record donation.');
        }
      },
    });
  }

  removeBatch(batch: Batch) {
    this.api.removeBatch(batch.id).subscribe({
      next: () => { this.toast.show('Batch removed', 'success'); this.load(); },
      error: () => this.toast.show('Failed to remove batch', 'error'),
    });
  }
}

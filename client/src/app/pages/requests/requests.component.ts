import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { BLOOD_GROUPS, BloodRequest } from '../../models/models';

@Component({
  selector: 'app-requests',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './requests.component.html',
  styleUrl: './requests.component.css',
})
export class RequestsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private toast = inject(ToastService);

  bloodGroups = BLOOD_GROUPS;
  requests = signal<BloodRequest[]>([]);
  search = signal('');
  statusFilter = signal('');

  showModal = signal(false);
  formError = signal('');

  urgencyLabel: Record<string, string> = { critical: 'Critical', high: 'High', normal: 'Normal' };
  statusCap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  form = this.fb.group({
    patientName: ['', Validators.required],
    hospital: ['', Validators.required],
    bloodGroup: ['O+'],
    units: [1, [Validators.required, Validators.min(1), Validators.max(10)]],
    urgency: ['normal'],
    contact: ['', Validators.required],
  });

  filtered = computed(() => {
    const search = this.search().trim().toLowerCase();
    const status = this.statusFilter();
    let list = [...this.requests()].sort((a, b) => b.date.localeCompare(a.date));
    return list.filter((r) => {
      if (search && !r.patientName.toLowerCase().includes(search) && !r.hospital.toLowerCase().includes(search)) return false;
      if (status && r.status !== status) return false;
      return true;
    });
  });

  ngOnInit() {
    this.load();
  }

  load() {
    this.api.getRequests().subscribe({
      next: (r) => this.requests.set(r),
      error: () => this.toast.show('Failed to load requests', 'error'),
    });
  }

  openAdd() {
    this.formError.set('');
    this.form.reset({ patientName: '', hospital: '', bloodGroup: 'O+', units: 1, urgency: 'normal', contact: '' });
    this.showModal.set(true);
  }
  closeModal() {
    this.showModal.set(false);
  }

  submit() {
    if (this.form.invalid) {
      this.formError.set('Please fill in all required fields.');
      return;
    }
    this.api.addRequest(this.form.value).subscribe({
      next: () => { this.toast.show('Request submitted', 'success'); this.closeModal(); this.load(); },
      error: (err) => this.formError.set(err?.error?.error || 'Failed to submit request.'),
    });
  }

  approve(r: BloodRequest) {
    this.api.approveRequest(r.id).subscribe({
      next: () => { this.toast.show('Request approved', 'success'); this.load(); },
      error: () => this.toast.show('Failed to approve request', 'error'),
    });
  }
  reject(r: BloodRequest) {
    this.api.rejectRequest(r.id).subscribe({
      next: () => { this.toast.show('Request rejected', 'success'); this.load(); },
      error: () => this.toast.show('Failed to reject request', 'error'),
    });
  }
  fulfill(r: BloodRequest) {
    this.api.fulfillRequest(r.id).subscribe({
      next: () => { this.toast.show('Request fulfilled, inventory updated', 'success'); this.load(); },
      error: (err) => this.toast.show(err?.error?.error || 'Failed to fulfill request', 'error'),
    });
  }
}

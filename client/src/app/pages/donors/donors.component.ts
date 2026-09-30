import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { BLOOD_GROUPS, Donor } from '../../models/models';

@Component({
  selector: 'app-donors',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './donors.component.html',
  styleUrl: './donors.component.css',
})
export class DonorsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private toast = inject(ToastService);

  bloodGroups = BLOOD_GROUPS;
  donors = signal<Donor[]>([]);
  search = signal('');
  filterGroup = signal('');
  filterEligible = signal('');

  showModal = signal(false);
  editingDonor = signal<Donor | null>(null);
  formError = signal('');

  form = this.fb.group({
    name: ['', Validators.required],
    age: [18, [Validators.required, Validators.min(18), Validators.max(65)]],
    gender: ['Male'],
    bloodGroup: ['O+'],
    phone: ['', Validators.required],
    email: [''],
    address: [''],
  });

  filtered = computed(() => {
    const search = this.search().trim().toLowerCase();
    const group = this.filterGroup();
    const elig = this.filterEligible();
    return this.donors().filter((d) => {
      if (search && !d.name.toLowerCase().includes(search) && !d.phone.includes(search)) return false;
      if (group && d.bloodGroup !== group) return false;
      if (elig === 'eligible' && !d.eligible) return false;
      if (elig === 'not' && d.eligible) return false;
      return true;
    });
  });

  ngOnInit() {
    this.load();
  }

  load() {
    this.api.getDonors().subscribe({
      next: (d) => this.donors.set(d),
      error: () => this.toast.show('Failed to load donors', 'error'),
    });
  }

  openAdd() {
    this.editingDonor.set(null);
    this.formError.set('');
    this.form.reset({ name: '', age: 18, gender: 'Male', bloodGroup: 'O+', phone: '', email: '', address: '' });
    this.showModal.set(true);
  }

  openEdit(donor: Donor) {
    this.editingDonor.set(donor);
    this.formError.set('');
    this.form.reset({
      name: donor.name, age: donor.age, gender: donor.gender, bloodGroup: donor.bloodGroup,
      phone: donor.phone, email: donor.email, address: donor.address,
    });
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  submit() {
    if (this.form.invalid) {
      this.formError.set('Please fill in all required fields (age must be 18–65).');
      this.form.markAllAsTouched();
      return;
    }
    const payload = this.form.value;
    const editing = this.editingDonor();
    if (editing) {
      this.api.updateDonor(editing.id, payload).subscribe({
        next: () => { this.toast.show('Donor updated', 'success'); this.closeModal(); this.load(); },
        error: (err) => this.formError.set(err?.error?.error || 'Failed to update donor.'),
      });
    } else {
      this.api.addDonor(payload).subscribe({
        next: () => { this.toast.show('Donor added', 'success'); this.closeModal(); this.load(); },
        error: (err) => this.formError.set(err?.error?.error || 'Failed to add donor.'),
      });
    }
  }

  remove(donor: Donor) {
    if (!confirm(`Delete donor "${donor.name}"? This does not remove their past donation records.`)) return;
    this.api.deleteDonor(donor.id).subscribe({
      next: () => { this.toast.show('Donor deleted', 'success'); this.load(); },
      error: () => this.toast.show('Failed to delete donor', 'error'),
    });
  }
}

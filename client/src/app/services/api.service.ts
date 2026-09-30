import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Batch, DashboardData, Donation, Donor, BloodRequest, Inventory,
} from '../models/models';

const API = '/api';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  // Dashboard
  getDashboard(): Observable<DashboardData> {
    return this.http.get<DashboardData>(`${API}/dashboard`);
  }

  // Donors
  getDonors(): Observable<Donor[]> {
    return this.http.get<Donor[]>(`${API}/donors`);
  }
  addDonor(payload: Record<string, unknown>): Observable<Donor> {
    return this.http.post<Donor>(`${API}/donors`, payload);
  }
  updateDonor(id: string, payload: Record<string, unknown>): Observable<Donor> {
    return this.http.put<Donor>(`${API}/donors/${id}`, payload);
  }
  deleteDonor(id: string): Observable<void> {
    return this.http.delete<void>(`${API}/donors/${id}`);
  }

  // Inventory
  getInventory(): Observable<Inventory> {
    return this.http.get<Inventory>(`${API}/inventory`);
  }
  getBatches(bloodGroup?: string): Observable<Batch[]> {
    const url = bloodGroup ? `${API}/inventory/batches?bloodGroup=${encodeURIComponent(bloodGroup)}` : `${API}/inventory/batches`;
    return this.http.get<Batch[]>(url);
  }
  removeBatch(id: string): Observable<void> {
    return this.http.delete<void>(`${API}/inventory/batches/${id}`);
  }

  // Donations
  getDonations(): Observable<Donation[]> {
    return this.http.get<Donation[]>(`${API}/donations`);
  }
  addDonation(payload: Record<string, unknown>): Observable<Donation> {
    return this.http.post<Donation>(`${API}/donations`, payload);
  }

  // Requests
  getRequests(status?: string): Observable<BloodRequest[]> {
    const url = status ? `${API}/requests?status=${encodeURIComponent(status)}` : `${API}/requests`;
    return this.http.get<BloodRequest[]>(url);
  }
  addRequest(payload: Record<string, unknown>): Observable<BloodRequest> {
    return this.http.post<BloodRequest>(`${API}/requests`, payload);
  }
  approveRequest(id: string): Observable<BloodRequest> {
    return this.http.patch<BloodRequest>(`${API}/requests/${id}/approve`, {});
  }
  rejectRequest(id: string): Observable<BloodRequest> {
    return this.http.patch<BloodRequest>(`${API}/requests/${id}/reject`, {});
  }
  fulfillRequest(id: string): Observable<BloodRequest> {
    return this.http.patch<BloodRequest>(`${API}/requests/${id}/fulfill`, {});
  }

  // Reset
  resetDemoData(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${API}/reset`, {});
  }
}

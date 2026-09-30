export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
export type BloodGroup = typeof BLOOD_GROUPS[number];

export interface Donor {
  id: string;
  name: string;
  age: number;
  gender: string;
  bloodGroup: BloodGroup;
  phone: string;
  email: string;
  address: string;
  lastDonationDate: string | null;
  totalDonations: number;
  eligible: boolean;
  eligibleInDays: number;
}

export interface Batch {
  id: string;
  bloodGroup: BloodGroup;
  units: number;
  collectedDate: string;
  expiryDate: string;
  donationId: string;
  status: 'fresh' | 'expiring' | 'expired';
}

export interface InventoryEntry {
  units: number;
  low: boolean;
}
export type Inventory = Record<string, InventoryEntry>;

export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'fulfilled';
export type Urgency = 'normal' | 'high' | 'critical';

export interface BloodRequest {
  id: string;
  patientName: string;
  hospital: string;
  bloodGroup: BloodGroup;
  units: number;
  urgency: Urgency;
  status: RequestStatus;
  date: string;
  contact: string;
}

export interface Donation {
  id: string;
  donorId: string;
  donorName: string;
  bloodGroup: BloodGroup;
  units: number;
  date: string;
  center: string;
}

export interface Activity {
  ts: number;
  text: string;
}

export interface DashboardData {
  stats: {
    totalDonors: number;
    eligibleDonors: number;
    totalUnits: number;
    pendingRequests: number;
    totalRequests: number;
    totalDonations: number;
    expiredBatches: number;
  };
  inventory: Record<string, number>;
  alerts: { text: string; ok: boolean }[];
  activity: Activity[];
}

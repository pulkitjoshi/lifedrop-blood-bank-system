import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent) },
  { path: 'donors', loadComponent: () => import('./pages/donors/donors.component').then(m => m.DonorsComponent) },
  { path: 'inventory', loadComponent: () => import('./pages/inventory/inventory.component').then(m => m.InventoryComponent) },
  { path: 'requests', loadComponent: () => import('./pages/requests/requests.component').then(m => m.RequestsComponent) },
  { path: 'donations', loadComponent: () => import('./pages/donations/donations.component').then(m => m.DonationsComponent) },
  { path: '**', redirectTo: 'dashboard' },
];

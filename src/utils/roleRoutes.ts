import type { AccountRole } from '../types/artverse.js';

export function dashboardPathForRole(role: AccountRole): string {
  switch (role) {
    case 'admin':
      return '/admin';
    case 'artist':
      return '/dashboard/artist';
    case 'collector':
      return '/dashboard/collector';
    case 'art_lover':
      return '/dashboard/art-lover';
  }
}

export interface SyncProfileRecord {
  id: string;
  email: string;
  fullName: string;
  handle: string;
  username: string;
  role: string;
  bio: string;
  location: string;
  registrationDate: Date;
  createdAt: Date | string;
}

export interface SyncProfileValues {
  id: string;
  email: string;
  fullName: string;
  handle: string;
  username: string;
  role: string;
  accountStatus: string;
  registrationDate: Date;
  bio: string;
  location: string;
  discipline: string;
  verified: boolean;
  isDemo: boolean;
}

export interface ProfileSyncOperations<TProfile extends SyncProfileRecord> {
  getProfile(uid: string): Promise<TProfile | undefined>;
  isHandleTaken(handle: string, exceptUid: string): Promise<boolean>;
  insertProfile(values: SyncProfileValues): Promise<TProfile>;
  updateProfile(
    uid: string,
    values: Pick<
      SyncProfileValues,
      'email' | 'fullName' | 'handle' | 'username' | 'role' | 'bio' | 'location'
    >
  ): Promise<TProfile>;
  saveAccountDetails(params: {
    uid: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    location?: string;
  }): Promise<void>;
}

export interface SyncUserProfileParams {
  uid: string;
  email?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  role?: string;
  bio?: string;
  location?: string;
  isAdmin?: boolean;
}

const USER_ROLES = ['artist', 'collector', 'art_lover'];

export function sanitizeHandle(input: string): string {
  const cleaned = input
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 28);
  return cleaned || 'artist';
}

export async function allocateUniqueHandle(
  name: string,
  uid: string,
  isTaken: (candidate: string) => Promise<boolean>
): Promise<string> {
  const base = sanitizeHandle(name);
  if (!(await isTaken(base))) return base;

  const suffix = uid.toLowerCase().replace(/[^a-z0-9]/g, '').slice(-10) || 'member';
  for (let attempt = 0; attempt < 1000; attempt += 1) {
    const tail = `${suffix}${attempt ? `_${attempt}` : ''}`;
    const candidate = `${base.slice(0, 28 - tail.length - 1)}_${tail}`;
    if (!(await isTaken(candidate))) return candidate;
  }

  throw new Error('Unable to allocate a unique profile username.');
}

export async function syncProfileWithOperations<TProfile extends SyncProfileRecord>(
  params: SyncUserProfileParams,
  operations: ProfileSyncOperations<TProfile>
): Promise<TProfile> {
  const uid = params.uid.trim();
  if (!uid) throw new Error('An authenticated user ID is required to synchronize a profile.');

  const providedEmail = params.email?.trim();
  const validRole = params.role && USER_ROLES.includes(params.role)
    ? params.role
    : undefined;

  const current = await operations.getProfile(uid);
  const fullName =
    params.fullName?.trim() ||
    current?.fullName?.trim() ||
    providedEmail?.split('@')[0].replace(/[._-]/g, ' ') ||
    'Artivora Artist';
  const email = providedEmail || current?.email || `${uid}@artverse.user`;
  const role = params.isAdmin ? 'admin' : validRole || current?.role || 'collector';

  const username =
    current?.username?.trim() ||
    (await allocateUniqueHandle(fullName, uid, (candidate) =>
      operations.isHandleTaken(candidate, uid)
    ));
  const handle =
    current?.handle?.trim() ||
    (username !== current?.username
      ? username
      : await allocateUniqueHandle(fullName, uid, (candidate) =>
          operations.isHandleTaken(candidate, uid)
        ));

  const profile = current
    ? await operations.updateProfile(uid, {
        email,
        fullName,
        handle,
        username,
        role,
        bio: params.bio?.trim() || current.bio,
        location:
          role === 'artist'
            ? params.location?.trim() || current.location
            : current.location,
      })
    : await operations.insertProfile({
        id: uid,
        email,
        fullName,
        handle,
        username,
        role,
        accountStatus: 'active',
        registrationDate: new Date(),
        bio: params.bio?.trim() || '',
        location: role === 'artist' ? params.location?.trim() || '' : '',
        discipline: role === 'artist' ? 'Contemporary Fine Art' : 'Private Collection',
        verified: false,
        isDemo: false,
      });

  if (params.firstName?.trim() && params.lastName?.trim() && params.phoneNumber?.trim()) {
    await operations.saveAccountDetails({
      uid,
      firstName: params.firstName.trim(),
      lastName: params.lastName.trim(),
      phoneNumber: params.phoneNumber.trim(),
      location: params.location?.trim() || undefined,
    });
  }

  return profile;
}

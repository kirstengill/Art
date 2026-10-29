import assert from 'node:assert/strict';
import test from 'node:test';
import {
  allocateUniqueHandle,
  syncProfileWithOperations,
  type ProfileSyncOperations,
  type SyncProfileRecord,
  type SyncProfileValues,
} from './profileSync.ts';

interface TestProfile extends SyncProfileRecord {
  accountStatus: string;
  verified: boolean;
  isDemo: boolean;
}

function createOperations(initial?: TestProfile) {
  const profiles = new Map<string, TestProfile>();
  const accountDetails = new Map<string, {
    firstName: string;
    lastName: string;
    phoneNumber: string;
  }>();
  const operations: ProfileSyncOperations<TestProfile> = {
    async getProfile(uid) {
      return profiles.get(uid);
    },
    async isHandleTaken(handle, exceptUid) {
      return Array.from(profiles.values()).some(
        (profile) =>
          profile.id !== exceptUid &&
          (profile.handle === handle || profile.username === handle)
      );
    },
    async insertProfile(values: SyncProfileValues) {
      const profile = {
        ...values,
        registrationDate: values.registrationDate,
        createdAt: values.registrationDate,
      };
      profiles.set(profile.id, profile);
      return profile;
    },
    async updateProfile(uid, values) {
      const current = profiles.get(uid);
      assert.ok(current);
      const updated = { ...current, ...values };
      profiles.set(uid, updated);
      return updated;
    },
    async saveAccountDetails(params) {
      accountDetails.set(params.uid, {
        firstName: params.firstName,
        lastName: params.lastName,
        phoneNumber: params.phoneNumber,
      });
    },
  };
  if (initial) profiles.set(initial.id, initial);
  return { operations, profiles, accountDetails };
}

test('creates a first-time artist profile and persists complete private details', async () => {
  const { operations, profiles, accountDetails } = createOperations();

  const profile = await syncProfileWithOperations(
    {
      uid: 'auth-user-1',
      email: 'artist@example.test',
      fullName: 'Ada Artist',
      role: 'artist',
      firstName: 'Ada',
      lastName: 'Artist',
      phoneNumber: '555-0100',
    },
    operations
  );

  assert.equal(profile.id, 'auth-user-1');
  assert.equal(profile.role, 'artist');
  assert.equal(profiles.size, 1);
  assert.deepEqual(accountDetails.get(profile.id), {
    firstName: 'Ada',
    lastName: 'Artist',
    phoneNumber: '555-0100',
  });
});

test('updates existing profiles without replacing non-empty values with blanks', async () => {
  const existing: TestProfile = {
    id: 'auth-user-2',
    email: 'old@example.test',
    fullName: 'Grace Artist',
    handle: 'graceartist',
    username: 'graceartist',
    role: 'artist',
    accountStatus: 'suspended',
    bio: 'A saved biography.',
    location: 'Oslo',
    registrationDate: new Date('2024-01-01T00:00:00.000Z'),
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    verified: false,
    isDemo: false,
  };
  const { operations, profiles } = createOperations(existing);

  const profile = await syncProfileWithOperations(
    {
      uid: existing.id,
      fullName: '',
      bio: ' ',
      location: ' ',
    },
    operations
  );

  assert.equal(profile.fullName, existing.fullName);
  assert.equal(profile.username, existing.username);
  assert.equal(profile.bio, existing.bio);
  assert.equal(profile.location, existing.location);
  assert.equal(profile.role, existing.role);
  assert.equal(profile.accountStatus, 'suspended');
  assert.equal(profiles.size, 1);
});

test('repeated synchronization remains idempotent and keeps established usernames', async () => {
  const { operations, profiles } = createOperations();
  const params = {
    uid: 'auth-user-3',
    email: 'member@example.test',
    fullName: 'Morgan Art',
    role: 'artist',
  };

  const first = await syncProfileWithOperations(params, operations);
  const again = await syncProfileWithOperations(
    { ...params, fullName: 'Morgan New Name' },
    operations
  );

  assert.equal(profiles.size, 1);
  assert.equal(again.username, first.username);
});

test('rejects missing user IDs before database operations', async () => {
  const { operations, profiles } = createOperations();

  await assert.rejects(
    syncProfileWithOperations({ uid: '  ' }, operations),
    /authenticated user ID is required/
  );
  assert.equal(profiles.size, 0);
});

test('allocates a deterministic alternate username when a name is taken', async () => {
  const candidates: string[] = [];
  const handle = await allocateUniqueHandle('Ada Artist', 'auth-user-4', async (value) => {
    candidates.push(value);
    return value === 'adaartist';
  });

  assert.equal(handle, 'adaartist_authuser4');
  assert.deepEqual(candidates, ['adaartist', 'adaartist_authuser4']);
});

test('creates a new profile with a unique handle when another profile has the same name', async () => {
  const existing: TestProfile = {
    id: 'existing-user',
    email: 'existing@example.test',
    fullName: 'Ada Artist',
    handle: 'adaartist',
    username: 'adaartist',
    role: 'artist',
    accountStatus: 'active',
    bio: '',
    location: '',
    registrationDate: new Date('2024-01-01T00:00:00.000Z'),
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    verified: false,
    isDemo: false,
  };
  const { operations, profiles } = createOperations(existing);

  const profile = await syncProfileWithOperations(
    {
      uid: 'new-user-1',
      email: 'new@example.test',
      fullName: 'Ada Artist',
      role: 'artist',
    },
    operations
  );

  assert.equal(profile.username, 'adaartist_newuser1');
  assert.equal(profile.handle, 'adaartist_newuser1');
  assert.equal(profiles.size, 2);
});

test('skips account details when optional signup data is incomplete', async () => {
  const { operations, accountDetails } = createOperations();

  await syncProfileWithOperations(
    {
      uid: 'auth-user-5',
      email: 'member@example.test',
      role: 'art_lover',
      firstName: 'Alex',
    },
    operations
  );

  assert.equal(accountDetails.size, 0);
});

test('preserves Supabase profile lookup errors', async () => {
  const { operations } = createOperations();
  const databaseError = new Error('Supabase profile lookup failed.');
  operations.getProfile = async () => {
    throw databaseError;
  };

  await assert.rejects(
    syncProfileWithOperations(
      { uid: 'auth-user-6', email: 'member@example.test' },
      operations
    ),
    (error: unknown) => error === databaseError
  );
});

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();

// Keep ID token strictly in memory — never persist tokens in localStorage
let inMemoryIdToken: string | null = null;

export async function getValidAuthToken(): Promise<string | null> {
  if (!auth.currentUser) {
    inMemoryIdToken = null;
    return null;
  }
  inMemoryIdToken = await auth.currentUser.getIdToken();
  return inMemoryIdToken;
}

export function clearInMemoryToken() {
  inMemoryIdToken = null;
}

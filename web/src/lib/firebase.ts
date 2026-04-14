// ALLOUL&Q — Firebase Web SDK init
// Same project as the mobile app (see app.json extra.firebase)

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth, GoogleAuthProvider, GithubAuthProvider, OAuthProvider,
  signInWithPopup, type User as FirebaseUser,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyDJ3ekWJLQXVZuTfqOFxNqFSIlKyIe5CiU',
  authDomain: 'alloul.firebaseapp.com',
  projectId: 'alloul',
  storageBucket: 'alloul.appspot.com',
  messagingSenderId: '458917264125',
  appId: '1:458917264125:web:12e01e5c281f9ef5411c94',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// ─── Providers ──────────────────────────────────────────────────────────────

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

const githubProvider = new GithubAuthProvider();
githubProvider.addScope('read:user');
githubProvider.addScope('user:email');

// Apple Sign In
const appleProvider = new OAuthProvider('apple.com');
appleProvider.addScope('email');
appleProvider.addScope('name');

// ─── Sign-in functions ─────────────────────────────────────────────────────

export async function signInWithGoogle(): Promise<string> {
  const result = await signInWithPopup(auth, googleProvider);
  const idToken = await result.user.getIdToken();
  return idToken;
}

export async function signInWithGithub(): Promise<string> {
  const result = await signInWithPopup(auth, githubProvider);
  const idToken = await result.user.getIdToken();
  return idToken;
}

export async function signInWithApple(): Promise<string> {
  const result = await signInWithPopup(auth, appleProvider);
  const idToken = await result.user.getIdToken();
  return idToken;
}

export type { FirebaseUser };

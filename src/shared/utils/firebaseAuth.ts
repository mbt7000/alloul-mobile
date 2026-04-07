import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  type Auth,
  initializeAuth,
  getAuth,
  GithubAuthProvider,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithCredential,
  signOut,
} from "firebase/auth";

// getReactNativePersistence may be in different export paths depending on Firebase version
let rnPersistence: ((storage: any) => any) | null = null;
try {
  // Firebase 10.x: exported from firebase/auth
  const authMod = require("firebase/auth");
  if (typeof authMod.getReactNativePersistence === "function") {
    rnPersistence = authMod.getReactNativePersistence;
  }
} catch {}
if (!rnPersistence) {
  try {
    // Firebase 10.x alternative: from /react-native subpath
    const rnMod = require("firebase/auth/react-native");
    if (typeof rnMod.getReactNativePersistence === "function") {
      rnPersistence = rnMod.getReactNativePersistence;
    }
  } catch {}
}

type FirebaseExtra = {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
};

function getFirebaseExtra(): FirebaseExtra {
  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;
  return (extra.firebase as FirebaseExtra | undefined) ?? {};
}

function getFirebaseApp(): FirebaseApp {
  const firebase = getFirebaseExtra();
  if (!firebase.apiKey || !firebase.projectId || !firebase.appId) {
    throw new Error("FIREBASE_NOT_CONFIGURED");
  }

  if (getApps().length > 0) return getApp();

  return initializeApp({
    apiKey: firebase.apiKey,
    authDomain: firebase.authDomain,
    projectId: firebase.projectId,
    storageBucket: firebase.storageBucket,
    messagingSenderId: firebase.messagingSenderId,
    appId: firebase.appId,
  });
}

let cachedAuth: Auth | null = null;

function getFirebaseAuth(): Auth {
  if (cachedAuth) return cachedAuth;
  const app = getFirebaseApp();

  if (Platform.OS === "web") {
    cachedAuth = getAuth(app);
    return cachedAuth;
  }

  // On React Native, use initializeAuth with persistence if available
  try {
    if (rnPersistence) {
      cachedAuth = initializeAuth(app, {
        persistence: rnPersistence(AsyncStorage),
      });
    } else {
      // No RN persistence available — initialize without it
      cachedAuth = initializeAuth(app, {} as any);
    }
  } catch {
    // Already initialized (hot reload) — get existing instance
    try {
      cachedAuth = getAuth(app);
    } catch {
      cachedAuth = initializeAuth(app, {} as any);
    }
  }
  return cachedAuth;
}

/**
 * يحوّل Google id_token (ومفضّلًا access_token) إلى Firebase id_token للـ backend.
 * تمرير access_token يقلّل أخطاء auth/invalid-credential عند بعض إعدادات OAuth.
 */
export async function exchangeGoogleIdTokenForFirebaseIdToken(
  googleIdToken: string | null,
  googleAccessToken?: string | null
): Promise<string> {
  const auth = getFirebaseAuth();
  // GoogleAuthProvider.credential accepts (idToken, accessToken) — either can be null
  const credential = GoogleAuthProvider.credential(
    googleIdToken || null,
    googleAccessToken && googleAccessToken.length > 0 ? googleAccessToken : null
  );
  const userCredential = await signInWithCredential(auth, credential);
  const idToken = await userCredential.user.getIdToken(true);

  await signOut(auth).catch(() => {});
  return idToken;
}

/** GitHub OAuth access_token → Firebase id_token للـ backend (فعّل GitHub في Firebase Authentication). */
export async function exchangeGithubAccessTokenForFirebaseIdToken(accessToken: string): Promise<string> {
  const auth = getFirebaseAuth();
  const credential = GithubAuthProvider.credential(accessToken);
  const userCredential = await signInWithCredential(auth, credential);
  const idToken = await userCredential.user.getIdToken(true);
  await signOut(auth).catch(() => {});
  return idToken;
}

/** Apple identityToken + نفس rawNonce (غير المُجزأ) المستخدم لاشتقاق SHA256 المرسل لـ Apple. */
export async function exchangeAppleIdTokenForFirebaseIdToken(
  appleIdentityToken: string,
  rawNonce: string
): Promise<string> {
  const auth = getFirebaseAuth();
  const provider = new OAuthProvider("apple.com");
  const credential = provider.credential({
    idToken: appleIdentityToken,
    rawNonce,
  });
  const userCredential = await signInWithCredential(auth, credential);
  const idToken = await userCredential.user.getIdToken(true);
  await signOut(auth).catch(() => {});
  return idToken;
}

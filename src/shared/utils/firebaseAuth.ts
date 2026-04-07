/**
 * Firebase Auth via REST API — no Firebase JS SDK needed.
 * Uses https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp
 * to exchange provider tokens for a Firebase ID token.
 */
import Constants from "expo-constants";

type FirebaseExtra = {
  apiKey?: string;
  projectId?: string;
};

function getFirebaseApiKey(): string {
  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;
  const firebase = (extra.firebase as FirebaseExtra | undefined) ?? {};
  if (!firebase.apiKey) throw new Error("FIREBASE_NOT_CONFIGURED");
  return firebase.apiKey;
}

/**
 * Call Firebase REST API to sign in with an identity provider.
 * Returns a Firebase ID token that can be sent to our backend.
 */
async function signInWithIdp(postBody: string): Promise<string> {
  const apiKey = getFirebaseApiKey();
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requestUri: "https://alloul.firebaseapp.com/__/auth/handler",
      postBody,
      returnSecureToken: true,
      returnIdpCredential: true,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    const errMsg = data?.error?.message || "Firebase sign-in failed";
    throw new Error(errMsg);
  }

  if (!data.idToken) {
    throw new Error("No idToken returned from Firebase");
  }

  return data.idToken;
}

/**
 * Google id_token and/or access_token → Firebase ID token.
 */
export async function exchangeGoogleIdTokenForFirebaseIdToken(
  googleIdToken: string | null,
  googleAccessToken?: string | null
): Promise<string> {
  let postBody: string;
  if (googleIdToken) {
    postBody = `id_token=${encodeURIComponent(googleIdToken)}&providerId=google.com`;
  } else if (googleAccessToken) {
    postBody = `access_token=${encodeURIComponent(googleAccessToken)}&providerId=google.com`;
  } else {
    throw new Error("No Google token available");
  }
  return signInWithIdp(postBody);
}

/**
 * GitHub access_token → Firebase ID token.
 */
export async function exchangeGithubAccessTokenForFirebaseIdToken(
  accessToken: string
): Promise<string> {
  const postBody = `access_token=${encodeURIComponent(accessToken)}&providerId=github.com`;
  return signInWithIdp(postBody);
}

/**
 * Apple identity_token + nonce → Firebase ID token.
 */
export async function exchangeAppleIdTokenForFirebaseIdToken(
  appleIdentityToken: string,
  rawNonce: string
): Promise<string> {
  const postBody = `id_token=${encodeURIComponent(appleIdentityToken)}&providerId=apple.com&nonce=${encodeURIComponent(rawNonce)}`;
  return signInWithIdp(postBody);
}

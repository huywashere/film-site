import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  onIdTokenChanged,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  type Auth,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

const isBrowser = typeof window !== "undefined";
export const isFirebaseConfigured =
  Object.values(firebaseConfig).every(Boolean);

let app: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let googleProvider: GoogleAuthProvider | null = null;
let facebookProvider: FacebookAuthProvider | null = null;

if (isBrowser && isFirebaseConfigured) {
  try {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    firebaseAuth = getAuth(app);
    setPersistence(firebaseAuth, browserLocalPersistence).catch((e) =>
      console.warn("Firebase persistence warning:", e),
    );

    googleProvider = new GoogleAuthProvider();
    googleProvider.addScope("email");
    googleProvider.addScope("profile");
    googleProvider.setCustomParameters({ prompt: "select_account" });

    facebookProvider = new FacebookAuthProvider();
    facebookProvider.addScope("email");
    facebookProvider.addScope("public_profile");
  } catch (err) {
    console.warn("Firebase Auth init warning:", err);
  }
} else if (isBrowser && process.env.NODE_ENV === "development") {
  console.warn(
    "Firebase Auth is disabled because its environment variables are incomplete.",
  );
}

export function getFirebaseAuth(): Auth {
  if (!firebaseAuth) {
    throw new Error("Firebase Auth is not configured.");
  }
  return firebaseAuth;
}

export function getGoogleProvider(): GoogleAuthProvider {
  if (!googleProvider) {
    throw new Error("Google authentication is not configured.");
  }
  return googleProvider;
}

export function getFacebookProvider(): FacebookAuthProvider {
  if (!facebookProvider) {
    throw new Error("Facebook authentication is not configured.");
  }
  return facebookProvider;
}

export {
  app,
  firebaseAuth,
  googleProvider,
  facebookProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  onIdTokenChanged,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
};

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signInWithCredential,
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

const isBrowser = typeof window !== "undefined";

const getAuthDomain = (): string => {
  return (
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    "flexphim-1.firebaseapp.com"
  );
};

const firebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    "AIzaSyB1R7zywKQutoHXg8oAsfOKXt11kZeSY7I",
  authDomain: getAuthDomain(),
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    "flexphim-1",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    "flexphim-1.firebasestorage.app",
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
    "1072309032788",
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
    "1:1072309032788:web:5dd1a252f1ea97e8775ac1",
};

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
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signInWithCredential,
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

import { initializeApp, getApps, getApp } from "firebase/app";
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
} from "firebase/auth";

const firebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    "AIzaSyBgJ17X1FHA2vcu7Uq88Qcnuo3pFCi3Ixk",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    "film-site-eb0c4.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "film-site-eb0c4",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    "film-site-eb0c4.firebasestorage.app",
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "872645160784",
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
    "1:872645160784:web:402aa0eadfa47ff3884655",
};

const isBrowser = typeof window !== "undefined";

let app: any = null;
let firebaseAuth: any = null;
let googleProvider: any = null;
let facebookProvider: any = null;

if (isBrowser) {
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

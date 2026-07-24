// Firebase Authentication only — Principle Pitch uses Firebase strictly for
// user accounts (email/password + Google sign-in). App data (sessions,
// documents) still lives in the MySQL/JSON store on the backend, tagged with
// the Firebase UID. No Firestore, no firebase-admin.
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAPt8BCfkfvXryJPS1G2Ma12BU7tcWQO7I",
  authDomain: "principlepitch.firebaseapp.com",
  projectId: "principlepitch",
  storageBucket: "principlepitch.firebasestorage.app",
  messagingSenderId: "583029877327",
  appId: "1:583029877327:web:55fece4fef760fdcac983a",
  measurementId: "G-QXZ2MKH4RW",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

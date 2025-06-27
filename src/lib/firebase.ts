// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBlKr5prSIXiW6UPzpI8MDj7wVdOXLrGtY",
  authDomain: "retsary-e622c.firebaseapp.com",
  projectId: "retsary-e622c",
  storageBucket: "retsary-e622c.firebasestorage.app",
  messagingSenderId: "1080480805531",
  appId: "1:1080480805531:web:326d55de0777df33914c3e",
  measurementId: "G-4NFQ9CH8Z0"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };

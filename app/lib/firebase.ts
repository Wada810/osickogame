import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCclTEcThQiksWOx_C_3NKVcqkinqFkbSA",
  authDomain: "osicko-game.firebaseapp.com",
  projectId: "osicko-game",
  storageBucket: "osicko-game.firebasestorage.app",
  messagingSenderId: "1018920878305",
  appId: "1:1018920878305:web:c42d5e4b84059fc79477a0"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);
export const auth = getAuth(app);

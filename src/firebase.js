import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Free sandboxed Firebase credentials for Finansiku sync feature
const firebaseConfig = {
  apiKey: "AIzaSyCsW-yZ7-t1J3Y_29tP2x2s-uJqD4nE5pE",
  authDomain: "expense-tracker-sync-c6629.firebaseapp.com",
  projectId: "expense-tracker-sync-c6629",
  storageBucket: "expense-tracker-sync-c6629.appspot.com",
  messagingSenderId: "1052601732912",
  appId: "1:1052601732912:web:9b97779bc952dfa2f6027a",
  measurementId: "G-L3Z1Y0L88P"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

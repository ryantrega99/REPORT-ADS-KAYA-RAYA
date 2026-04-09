import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, query, where, onSnapshot, updateDoc, deleteDoc, Timestamp, addDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyARd4fFDkeErs-lT71HRlLCWkdvN3RkRQg",
  authDomain: "ads-mr-bob-report.firebaseapp.com",
  projectId: "ads-mr-bob-report",
  storageBucket: "ads-mr-bob-report.firebasestorage.app",
  messagingSenderId: "67027368740",
  appId: "1:67027368740:web:c695dc7bbf3ae1e8c0d1b1",
  measurementId: "G-70D51TPZ85"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  onSnapshot, 
  updateDoc, 
  deleteDoc, 
  Timestamp,
  addDoc
};

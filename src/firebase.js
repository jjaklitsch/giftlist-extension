import { initializeApp, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyAXdTT8STbQJeVzcOdR0Yf2C0RGHNt_Xgk",
  authDomain: "giftlist-31067.firebaseapp.com",
  projectId: "giftlist-31067",
  storageBucket: "giftlist-31067.appspot.com",
  messagingSenderId: "192788379011",
  appId: "1:192788379011:web:e7692e4e06a5ded3dc72b6",
  measurementId: "G-1LPY0XNFC3"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore();

export const auth = getAuth(app);
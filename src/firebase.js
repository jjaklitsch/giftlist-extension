import * as firebase from 'firebase';
import 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBSoEgmmmD9odaJYRZphc-wRZ9bXtShB28",
  authDomain: "giftlist-31067.firebaseapp.com",
  databaseURL: "https://giftlist-31067-default-rtdb.firebaseio.com",
  projectId: "giftlist-31067",
  storageBucket: "giftlist-31067.appspot.com",
  messagingSenderId: "192788379011",
  appId: "1:192788379011:web:e7692e4e06a5ded3dc72b6",
  measurementId: "G-1LPY0XNFC3"
};

firebase.initializeApp(firebaseConfig);
firebase.firestore();

export default firebase;
const { initializeApp } = require("firebase/app");
const { getFirestore } = require("firebase/firestore");

const firebaseConfig = {
  apiKey: "AIzaSyBQ650Ej4YZvL5nD5TL6jxaKQkBHrO3VOo",
  authDomain: "prevew-clint-data.firebaseapp.com",
  projectId: "prevew-clint-data",
  storageBucket: "prevew-clint-data.firebasestorage.app",
  messagingSenderId: "1023683734873",
  appId: "1:1023683734873:web:fbecab11a80addb3733048",
  measurementId: "G-WCPFWM27JQ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

module.exports = { db };

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCi5nA-ZtNLgVDM0UIJj7cWrPQhulEPy70",
  authDomain: "prepassist-v2.firebaseapp.com",
  projectId: "prepassist-v2",
  storageBucket: "prepassist-v2.firebasestorage.app",
  messagingSenderId: "848376794933",
  appId: "1:848376794933:web:6f10da60d65ccdc470067c",
  measurementId: "G-7SK33BJQWG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
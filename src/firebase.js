import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDkNyI69iEnxxNr9i_yKU3cIREkcggrDaU",
  authDomain: "thumbs-up-golf.firebaseapp.com",
  projectId: "thumbs-up-golf",
  storageBucket: "thumbs-up-golf.firebasestorage.app",
  messagingSenderId: "101392441681",
  appId: "1:101392441681:web:2e8ecf3b50cb1dfd29f370"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
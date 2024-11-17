// Import the functions you need from the SDKs you need
import { initializeApp } from '@firebase/app';
import { getFirestore } from '@firebase/firestore';
import { getAnalytics } from '@firebase/analytics';
import { getStorage } from '@firebase/storage';  // Añadir esta importación

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC8tAD6r7P6Uw-3l8sTzKZJbZkDamsXgYk",
  authDomain: "preticor-b8c0d.firebaseapp.com",
  projectId: "preticor-b8c0d",
  storageBucket: "preticor-b8c0d.appspot.com",
  messagingSenderId: "1052984801220",
  appId: "1:1052984801220:web:7ce62b4d83230d2b665691",
  measurementId: "G-ZR8DV4RBT1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const storage = getStorage(app);  // Inicializar Storage

export { db, storage };  // Exportar storage junto con db
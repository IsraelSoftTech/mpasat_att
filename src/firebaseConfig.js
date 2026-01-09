// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCkT6uQIqmAw9hKBF2OHtB1pQFFx1dqR6U",
  authDomain: "teacherattendance-32c32.firebaseapp.com",
  databaseURL: "https://teacherattendance-32c32-default-rtdb.firebaseio.com",
  projectId: "teacherattendance-32c32",
  storageBucket: "teacherattendance-32c32.firebasestorage.app",
  messagingSenderId: "284828846319",
  appId: "1:284828846319:web:18156529b7953eb567f31a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database and get a reference to the service
export const database = getDatabase(app);

export default app;

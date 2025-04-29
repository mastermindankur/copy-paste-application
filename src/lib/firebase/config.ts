import { initializeApp, getApps, getApp, FirebaseOptions } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Ensure all required environment variables are defined
const requiredEnvVars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error(`Error: Missing Firebase environment variables: ${missingEnvVars.join(', ')}`);
  console.error("Please ensure you have a .env file with the correct Firebase project configuration.");
  // Optionally throw an error or provide default values if suitable
  // throw new Error(`Missing Firebase environment variables: ${missingEnvVars.join(', ')}`);
}

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Optional
};

// Initialize Firebase
let app;
let auth: ReturnType<typeof getAuth>;
let db: ReturnType<typeof getFirestore>;
let storage: ReturnType<typeof getStorage>;

try {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
} catch (error: any) {
    console.error("Firebase initialization error:", error);
    // Provide fallback or handle the error appropriately
    // For example, disable features requiring Firebase if initialization fails
    // Setting them to null or a specific error state might be an option
    // auth = null as any; // Or handle differently
    // db = null as any;
    // storage = null as any;
    if (error.code === 'auth/invalid-api-key' || error.message?.includes('api-key-not-valid')) {
        console.error("*******************************************************************");
        console.error(" INVALID FIREBASE API KEY DETECTED ");
        console.error(" Please check your .env file and ensure NEXT_PUBLIC_FIREBASE_API_KEY is correct.");
        console.error("*******************************************************************");
    } else if (error.message?.includes('Missing Firebase environment variables')) {
         console.error("*******************************************************************");
         console.error(" MISSING FIREBASE CONFIGURATION ");
         console.error(" Please ensure your .env file contains all required NEXT_PUBLIC_FIREBASE_* variables.");
         console.error("*******************************************************************");
    }
    // Rethrow or handle as needed for your application flow
    // throw error; // Optionally rethrow if you want the app to halt
}


export { app, auth, db, storage };

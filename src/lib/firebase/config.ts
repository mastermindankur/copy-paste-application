import { initializeApp, getApps, getApp, FirebaseOptions, FirebaseError } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Define required environment variables
const requiredEnvVars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
];

// Function to check if placeholder values are being used
const isPlaceholderValue = (value: string | undefined): boolean => {
    if (!value) return true;
    const placeholders = [
        "YOUR_API_KEY",
        "YOUR_PROJECT_ID.firebaseapp.com",
        "YOUR_PROJECT_ID",
        "YOUR_PROJECT_ID.appspot.com",
        "YOUR_SENDER_ID",
        "YOUR_APP_ID",
        "YOUR_MEASUREMENT_ID",
    ];
    return placeholders.includes(value);
}

// Check for missing environment variables
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
const usingPlaceholders = requiredEnvVars.some(envVar => isPlaceholderValue(process.env[envVar]));

let firebaseConfig: FirebaseOptions = {};
let firebaseInitializationError: string | null = null;

if (missingEnvVars.length > 0) {
  firebaseInitializationError = `Missing Firebase environment variables: ${missingEnvVars.join(', ')}. Please check your .env file.`;
  console.error(`Error: ${firebaseInitializationError}`);
} else if (usingPlaceholders) {
    firebaseInitializationError = `Using placeholder Firebase environment variables. Firebase features will not work correctly. Please update your .env file with actual credentials.`;
    console.warn(`Warning: ${firebaseInitializationError}`);
    // Proceed with placeholders for basic app structure rendering
    firebaseConfig = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
        measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    };
}
else {
    // All variables seem present and are not placeholders, configure Firebase
    firebaseConfig = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
        measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Optional
    };
}


// Initialize Firebase
let app: ReturnType<typeof initializeApp> | null = null;
let auth: ReturnType<typeof getAuth> | null = null;
let db: ReturnType<typeof getFirestore> | null = null;
let storage: ReturnType<typeof getStorage> | null = null;

// Only attempt initialization if config is present and no critical errors occurred
if (Object.keys(firebaseConfig).length > 0 && !firebaseInitializationError?.startsWith('Missing')) {
    try {
        app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
        auth = getAuth(app);
        db = getFirestore(app);
        storage = getStorage(app);
        // Clear placeholder warning if initialization succeeds with placeholders (though functionality is limited)
        if(usingPlaceholders && firebaseInitializationError?.startsWith('Using placeholder')) {
            firebaseInitializationError = null; // Consider it handled, app structure loads
        }
    } catch (error: any) {
        console.error("Firebase initialization error:", error);
        firebaseInitializationError = `Firebase Initialization Failed: ${error.message || 'Unknown error'}`;

        // Provide specific feedback based on error codes
        if (error instanceof FirebaseError) {
            if (error.code === 'auth/invalid-api-key' || error.code.includes('api-key-not-valid')) {
                firebaseInitializationError = "Firebase Error: Invalid API Key. Check NEXT_PUBLIC_FIREBASE_API_KEY in your .env file.";
                console.error("*******************************************************************");
                console.error(" INVALID FIREBASE API KEY DETECTED ");
                console.error(" Please check your .env file and ensure NEXT_PUBLIC_FIREBASE_API_KEY is correct.");
                console.error("*******************************************************************");
            } else {
                 firebaseInitializationError = `Firebase Error (${error.code}): ${error.message}`;
            }
        }
        // Nullify services if initialization fails
        app = null;
        auth = null;
        db = null;
        storage = null;
    }
} else {
    // Log the existing error if initialization wasn't attempted
    if (firebaseInitializationError) {
        console.error(firebaseInitializationError);
    } else {
        // This case should ideally not be reached if logic is correct
        console.error("Unknown error preventing Firebase initialization.");
        firebaseInitializationError = "Unknown error preventing Firebase initialization.";
    }
}

// Export the Firebase services and any initialization error message
export { app, auth, db, storage, firebaseInitializationError };

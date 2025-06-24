import { initializeApp } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getFirestore,connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

export default defineNuxtPlugin(() => {
    // Use runtimeConfig to safely access environment variables
    const runtimeConfig = useRuntimeConfig()
    if (!runtimeConfig.public.firebaseApiKey) {
        throw new Error('Firebase configuration is missing. Please check your environment variables.')
    }
    const firebaseConfig = {
        apiKey: runtimeConfig.public.firebaseApiKey,
        authDomain: runtimeConfig.public.firebaseAuthDomain,
        projectId: runtimeConfig.public.firebaseProjectId,
        storageBucket: runtimeConfig.public.firebaseStorageBucket,
        messagingSenderId: runtimeConfig.public.firebaseMessagingSenderId,
        appId: runtimeConfig.public.firebaseAppId
        
    }

    // Initialize Firebase
    const app = initializeApp(firebaseConfig)

    // Initialize Firebase Auth
    const auth = getAuth(app)

    // Initialize Firestore
    const firestore = getFirestore(app)

    // Initialize Firebase Functions
    const functions = getFunctions(app, 'us-central1')

    // Connect to Auth, Firestore, Functions emulator in development
    if (import.meta.dev && !auth.emulatorConfig) {
        connectAuthEmulator(auth, 'http://localhost:9099')
        connectFirestoreEmulator(firestore, 'localhost', 9098)
        connectFunctionsEmulator(functions, 'localhost', 5001)
        console.log('🔧 Connected to Firebase emulators')
    }

    // Make auth,firestore,functions available globally
    return {
        provide: {
            firebaseApp: app,
            auth,
            firestore,
            functions
        }
    }
})
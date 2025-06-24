/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */


import { beforeUserCreated, HttpsError } from "firebase-functions/v2/identity";
import { onDocumentDeleted } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";


// Connect to emulator in development
if (process.env.FUNCTIONS_EMULATOR === "true") {
    // Connect Admin SDK to emulators
    process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:9098";
    process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:5001";

    console.log("🔧 Running in emulator mode");
}

// Initialize Admin SDK
if (!admin.apps.length) {
    admin.initializeApp();

    //log emulator hosts
    console.log("Admin SDK initialized with the following emulator hosts:");
    console.log(`Firestore Emulator: ${process.env.FIRESTORE_EMULATOR_HOST }`);
    console.log(`Firebase Auth Emulator: ${process.env.FIREBASE_AUTH_EMULATOR_HOST}`);
}

/**
 * Auth trigger that runs when a new user is created.
 * It creates a new tenant document in Firestore and sets that document's ID
 * as the `tenantId` in the user's custom claims.
 * Uses transactions to ensure atomicity and sets custom claims via additionalClaims.
 */
export const assignTenantIdOnCreate = beforeUserCreated(async (event) => {
    const user = event.data;

    // Type guard to ensure user exists
    if (!user?.uid) {
        console.error("Invalid user data: missing UID", { user });
        throw new HttpsError("invalid-argument", "User data is invalid - missing UID");
    }

    // Ensure we have some identifier for the tenant name
    const tenantName = user.displayName || user.email || `User ${user.uid.slice(0, 8)}`;

    const db = admin.firestore();
    let createdTenantId: string | null = null;

    try {
        // Use a transaction to ensure atomicity
        await db.runTransaction(async (transaction) => {
            // Create a new document reference to get the ID before writing
            const tenantDocRef = db.collection("tenants").doc();
            createdTenantId = tenantDocRef.id;

            // Create the tenant document within the transaction
            transaction.set(tenantDocRef, {
                name: `${tenantName}`,
                ownerId: user.uid,
                status: 'active'
            });

            console.log(`Transaction: Creating tenant document with ID: ${createdTenantId} for user: ${user.uid}`);
        });

        // If we reach here, the transaction succeeded
        console.log(`Successfully created tenant document with ID: ${createdTenantId} for user: ${user.uid}`);

        // Return the event with additional claims
        // This ensures the custom claims are set when the user is actually created
        return {
            customClaims: {
                tenantId: createdTenantId,
            }
        };

    } catch (error) {
        console.error(`Error creating tenant for user: ${user.uid}`, error);

        // If the error is from the transaction itself, no cleanup is needed
        // as the transaction would have been rolled back automatically
        if (error instanceof HttpsError) {
            throw error; // Re-throw HttpsError as-is
        }

        // For beforeUserCreated, throwing an error will prevent user creation
        throw new HttpsError("internal", `Failed to set up tenant for user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
});

/**
 * A list of all known subcollections that exist under a zone document.
 * Add any new subcollection names to this array to ensure they are also deleted.
 */
const SUBCOLLECTIONS_TO_DELETE = ["people", "locations"];

/**
 * Runs *after* a zone document has been deleted.
 * It recursively deletes all documents within the known subcollections of that zone.
 */
export const onZoneDeleted = onDocumentDeleted("/tenants/{tenantId}/zones/{zoneId}", async (event) => {
    const { tenantId, zoneId } = event.params;
    console.log(`--- Starting subcollection cleanup for deleted zone: ${zoneId} in tenant: ${tenantId} ---`);

    for (const subcollection of SUBCOLLECTIONS_TO_DELETE) {
        const subcollectionPath = `/tenants/${tenantId}/zones/${zoneId}/${subcollection}`;
        await deleteCollection(subcollectionPath, 100); // Using a batch size of 100
    }

    console.log(`--- Finished cleanup for zone: ${zoneId} ---`);
});

/**
 * Deletes a collection in batches to avoid out-of-memory errors for large collections.
 * @param collectionPath The path to the collection to delete.
 * @param batchSize The number of documents to delete in each batch.
 */
async function deleteCollection(collectionPath: string, batchSize: number) {
    const db = admin.firestore();
    const collectionRef = db.collection(collectionPath);
    const query = collectionRef.orderBy('__name__').limit(batchSize);

    return new Promise<void>((resolve, reject) => {
        deleteQueryBatch(db, query, resolve).catch(reject);
    });
}

/**
 * Recursively deletes documents found in a query batch.
 * @param db The Firestore database instance.
 * @param query The query for the batch of documents to delete.
 * @param resolve The Promise's resolve function.
 */
async function deleteQueryBatch(db: admin.firestore.Firestore, query: admin.firestore.Query, resolve: () => void) {
    const snapshot = await query.get();

    // When there are no documents left, we are done
    if (snapshot.size === 0) {
        return resolve();
    }

    // Delete documents in a batch
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });
    await batch.commit();

    // Recurse on the next batch
    process.nextTick(() => {
        deleteQueryBatch(db, query, resolve);
    });
}


import {
  collection,
  doc,
  addDoc,
  updateDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  type QueryConstraint,
  type DocumentData,
  type FirestoreError,
} from 'firebase/firestore'
import { ref, onUnmounted, type Ref } from 'vue'

/**
 * A reactive, real-time Firestore collection query that automatically
 * unsubscribes when the component is unmounted.
 *
 * @param collectionPath - The path to the Firestore collection (e.g., 'tenants/tenant123/zones').
 * @param queryConstraints - An array of Firestore query constraints (e.g., where(), orderBy()).
 * @returns An object containing the reactive data, loading state, and error state.
 */
export function useCollection<T extends { id: string }>(
  collectionPath: string,
  ...queryConstraints: QueryConstraint[]
) {
  // Use the globally provided $firestore instance from the plugin
  const { $firestore } = useNuxtApp()

  const data: Ref<T[]> = ref([])
  const loading = ref(true)
  const error: Ref<FirestoreError | null> = ref(null)

  const collectionRef = collection($firestore, collectionPath)
  const q = query(collectionRef, ...queryConstraints)

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      // Map the documents and add the document ID to each object
      data.value = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as T[]
      loading.value = false
    },
    (err) => {
      console.error(`Error fetching collection ${collectionPath}:`, err)
      error.value = err
      loading.value = false
    }
  )

  // Unsubscribe from the real-time listener when the component is unmounted
  // to prevent memory leaks.
  onUnmounted(unsubscribe)

  return { data, loading, error }
}

/**
 * Adds a new document to a Firestore collection.
 *
 * @param collectionPath - The path to the Firestore collection.
 * @param data - The data for the new document (without an 'id' field).
 * @returns The ID of the newly created document.
 */
export async function addDocument<T>(collectionPath: string, data: T): Promise<string> {
  const { $firestore } = useNuxtApp()
  try {
    const docRef = await addDoc(collection($firestore, collectionPath), data as DocumentData)
    return docRef.id
  } catch (err) {
    console.error(`Error adding document to ${collectionPath}:`, err)
    throw new Error('Failed to add document.')
  }
}

/**
 * Updates an existing document in Firestore.
 *
 * @param docPath - The full path to the document to update (e.g., 'tenants/tenant123/zones/zone456').
 * @param data - An object containing the fields to update.
 */
export async function updateDocument<T>(docPath: string, data: Partial<T>): Promise<void> {
  const { $firestore } = useNuxtApp()
  try {
    await updateDoc(doc($firestore, docPath), data as DocumentData)
  } catch (err) {
    console.error(`Error updating document at ${docPath}:`, err)
    throw new Error('Failed to update document.')
  }
}

/**
 * Creates or overwrites a document at a specific path.
 *
 * @param docPath - The full path to the document.
 * @param data - The full data for the document.
 */
export async function setDocument<T>(docPath: string, data: T): Promise<void> {
  const { $firestore } = useNuxtApp()
  try {
    await setDoc(doc($firestore, docPath), data as DocumentData)
  } catch (err) {
    console.error(`Error setting document at ${docPath}:`, err)
    throw new Error('Failed to set document.')
  }
}

/**
 * Deletes a document from Firestore.
 *
 * @param docPath - The full path to the document to delete.
 */
export async function deleteDocument(docPath: string): Promise<void> {
  const { $firestore } = useNuxtApp()
  try {
    await deleteDoc(doc($firestore, docPath))
  } catch (err) {
    console.error(`Error deleting document at ${docPath}:`, err)
    throw new Error('Failed to delete document.')
  }
}

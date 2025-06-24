import { defineStore, storeToRefs } from 'pinia'
import { ref, watch, readonly } from 'vue'
import { useAuthStore } from './auth'
import { useCollection, addDocument, updateDocument } from '~/composables/useFirestore'
import type { Zone, ZonePerson } from '~/types'

export const useZonesStore = defineStore('zones', () => {
  // --- State ---
  const zones = ref<Zone[]>([])
  const selectedZoneId = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // --- Dependencies ---
  const authStore = useAuthStore()
  const { tenantId, isAuthenticated } = storeToRefs(authStore)

  // --- Getters (as Computed Properties) ---
  const selectedZone = computed(() => {
    return zones.value.find(z => z.id === selectedZoneId.value) || null
  })

  // --- Actions ---

  /**
   * Watches the tenantId and sets up a real-time listener for the zones collection.
   * This is the primary method for fetching data.
   */
  const initializeListener = () => {
    // Stop if there's no authenticated user
    if (!isAuthenticated.value) return

    // Watch for changes in tenantId to re-fetch data if it changes
    watch(tenantId, (newTenantId) => {
      if (newTenantId) {
        const { data: fetchedZones, error: fetchError, loading: fetchLoading } = useCollection<Zone>(
          `/tenants/${newTenantId}/zones`
        )

        // Watch the fetched data and update our local state
        watch(fetchedZones, (newZones) => {
          zones.value = newZones
        }, { immediate: true })

        watch(fetchLoading, (newLoading) => {
          loading.value = newLoading
        })

        watch(fetchError, (newError) => {
          error.value = newError ? newError.message : null
        })

      } else {
        // Clear zones if tenantId is null
        zones.value = []
      }
    }, { immediate: true }) // `immediate: true` runs the watcher on component mount
  }

  /**
   * Creates a new zone document in Firestore.
   * The local state will be updated automatically by the real-time listener.
   */
  const createZone = async (zoneData: Omit<Zone, 'id'>) => {
    loading.value = true
    error.value = null
    try {
      if (!tenantId.value) throw new Error('No tenant selected')

      await addDocument(`/tenants/${tenantId.value}/zones`, zoneData)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create zone'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Updates an existing zone document in Firestore.
   * The local state will be updated automatically by the real-time listener.
   */
  const updateZone = async (zoneData: Partial<Zone> & { id: string }) => {
    loading.value = true
    error.value = null
    try {
      if (!tenantId.value) throw new Error('No tenant selected')

      const { id, ...updateData } = zoneData
      await updateDocument(`/tenants/${tenantId.value}/zones/${id}`, updateData)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update zone'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Deletes a zone by marking it as deleted in Firestore.
   * The local state will be updated automatically by the real-time listener.
   */
  const deleteZone = async (zoneId: string) => {
    loading.value = true
    error.value = null
    try {
      if (!tenantId.value) throw new Error('No tenant selected')
      await deleteDocument(`/tenants/${tenantId.value}/zones/${zoneId}`)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete zone'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Sets the currently selected zone by its ID.
   */
  const selectZone = (zoneId: string | null) => {
    selectedZoneId.value = zoneId
  }

  /**
   * Add a person to a specific zone's people subcollection
   */
  const addPersonToZone = async (zoneId: string, personData: Omit<ZonePerson, 'id'>) => {
    if (!tenantId.value) {
      throw new Error('User tenant ID is required')
    }

    try {
      const collectionPath = `tenants/${tenantId.value}/zones/${zoneId}/people`

      // Add the person document to the zone's people subcollection
      const personId = await addDocument(collectionPath, personData)

      return personId
    } catch (err) {
      console.error('Error adding person to zone:', err)
      throw new Error(`Failed to add person to zone: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  /**
   * Update a person in a specific zone's people subcollection
   */
  const updatePersonInZone = async (zoneId: string, personId: string, personData: Partial<Omit<ZonePerson, 'id'>>) => {
    if (!tenantId.value) {
      throw new Error('User tenant ID is required')
    }

    try {
      const documentPath = `tenants/${tenantId.value}/zones/${zoneId}/people/${personId}`

      // Update the person document
      await updateDocument(documentPath, {
        ...personData,
        updatedAt: new Date()
      })
    } catch (err) {
      console.error('Error updating person in zone:', err)
      throw new Error(`Failed to update person in zone: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  /**
   * Remove a person from a specific zone's people subcollection
   */
  const removePersonFromZone = async (zoneId: string, personId: string) => {
    if (!tenantId.value) {
      throw new Error('User tenant ID is required')
    }

    try {
      const documentPath = `tenants/${tenantId.value}/zones/${zoneId}/people/${personId}`

      // Delete the person document
      await deleteDocument(documentPath)
    } catch (err) {
      console.error('Error removing person from zone:', err)
      throw new Error(`Failed to remove person from zone: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  /**
   * Get all people assigned to a specific zone
   */
  const getPeopleForZone = async (zoneId: string) => {
    if (!tenantId.value) {
      throw new Error('User tenant ID is required')
    }

    try {
      const collectionPath = `tenants/${tenantId.value}/zones/${zoneId}/people`
      const { data } = useCollection<ZonePerson>(collectionPath)
      return data.value
    } catch (err) {
      console.error('Error fetching people for zone:', err)
      throw new Error(`Failed to fetch people for zone: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  return {
    // State
    zones,
    selectedZoneId,
    loading: readonly(loading),
    error: readonly(error),

    // Getters
    selectedZone,

    // Actions
    initializeListener,
    createZone,
    updateZone,
    selectZone,
    deleteZone,
    // people-related actions
    addPersonToZone,
    updatePersonInZone,
    removePersonFromZone,
    getPeopleForZone
  }
})

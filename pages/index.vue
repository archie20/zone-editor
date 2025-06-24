<template>
  <div class="h-screen w-screen flex flex-col overflow-hidden">
    <!-- Navigation Header -->
    <nav class="bg-white shadow-sm border-b border-gray-200 z-30 flex-shrink-0">
      <div class="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <!-- Logo/Brand -->
          <div class="flex items-center">
            <div
              class="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center"
            >
              <span class="text-white font-bold text-sm">A</span>
            </div>
            <span class="ml-2 text-xl font-semibold text-gray-900"
              >ZoneMaster</span
            >
          </div>

          <!-- User Menu -->
          <div class="flex items-center space-x-4">
            <!-- Tenant Info -->
            <div v-if="tenantId" class="text-sm text-gray-600 hidden sm:block">
              Tenant: <span class="font-medium">{{ tenantId }}</span>
            </div>

            <!-- User Profile -->
            <div class="flex items-center space-x-3">
              <img
                v-if="userPhotoURL"
                :src="userPhotoURL"
                :alt="userName || 'User'"
                class="h-8 w-8 rounded-full"
              >
              <div
                v-else
                class="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center"
              >
                <span class="text-gray-600 text-sm font-medium">
                  {{ (userName || userEmail || "U").charAt(0).toUpperCase() }}
                </span>
              </div>
            </div>

            <!-- Sign Out Button -->
            <button
              :disabled="isLoading"
              class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              @click="handleSignOut"
            >
              <span class="hidden sm:inline">Sign Out</span>
              <span class="sm:hidden">Out</span>
            </button>
          </div>
        </div>
      </div>
    </nav>

    <!-- Main Content Area - Two Column Layout -->
    <main class="flex-1 flex overflow-hidden">
      <!-- Left Sidebar - Controls and Info -->
      <div class="w-1/5 bg-gray-50 border-r border-gray-200 flex flex-col overflow-hidden">
        <!-- Map Controls -->
        <div class="p-4 border-b border-gray-200">
          <MapControls />
        </div>
        
        <!-- Zone Info Panel -->
        <div class="flex-1 p-4 overflow-y-auto">
          <ZoneInfoPanel
            :zone="selectedZone"
            @edit-zone="handleEditZone"
            @delete-zone="handleDeleteZone"
            @add-person="handleAddPerson"
            @edit-person="handleEditPerson"
            @delete-person="handleDeleteZonePerson"
          />
        </div>
        
        
      </div>
      
      <!-- Right Side - Map View (80% width) -->
      <div class="w-4/5 relative">
        <MapView
          class="z-10"
          :zones="zones"
          @shape-drawn="handleShapeDrawn"
          @zone-selected="handleZoneSelected"
        />
      </div>
      <!-- Debug Information (only in development) -->
      <div
          v-if="isDev"
          class="absolute bottom-2 right-2 sm:bottom-5 sm:right-5 z-40 bg-yellow-50 border border-yellow-200 rounded-lg p-3 w-80 max-w-[calc(100vw-1rem)] sm:w-96"
        >
          <h3 class="text-sm font-medium text-yellow-800 mb-2">
            Debug Information
          </h3>
          <pre class="text-xs text-yellow-700 whitespace-pre-wrap overflow-x-auto">{{
            debugInfo
          }}</pre>
        </div>
    </main>

    <!-- Person Editor Modal -->
    <PersonEditorForm
      :is-open="isPersonEditorOpen"
      :existing-person="personToEdit"
      @save="handleSavePerson"
      @cancel="closePersonEditor"
    />
    
    <!-- Zone Editor Modal -->
    <ZoneEditorForm
      :is-open="isZoneEditorOpen"
      :existing-zone="zoneToEdit"
      :new-geometry="newZoneGeometry"
      @save="handleSaveZone"
      @cancel="closeZoneEditor"
    />
  </div>
</template>

<script setup lang="ts">
 
import { useAuthStore } from "~/store/auth";
import { useZonesStore } from "~/store/zones";
import type { Zone, ZoneGeometry, ZonePerson } from "~/types/index";
import { storeToRefs } from "pinia";

definePageMeta({
  middleware: "auth",
});

useHead({
  title: "Dashboard",
});

// --- STORES & STATE ---
const authStore = useAuthStore();
const { tenantId, userName, userEmail, userPhotoURL, isLoading } = storeToRefs(authStore);

const zonesStore = useZonesStore();
const { zones, selectedZone } = storeToRefs(zonesStore);

// Modal state
const isZoneEditorOpen = ref(false);
const isPersonEditorOpen = ref(false);
const zoneToEdit = ref<Zone | null>(null);
const newZoneGeometry = ref<ZoneGeometry | null>(null);
const personToEdit = ref<ZonePerson | null>(null);

const isDev = import.meta.dev;

// --- LIFECYCLE HOOKS ---
onMounted(() => {
  // Initialize the real-time listener for zones data
  zonesStore.initializeListener();
});

// --- DEBUGGING ---
const debugInfo = computed(() => {
  return JSON.stringify(
    {
      tenantId: tenantId.value,
      userEmail: userEmail.value,
      zonesCount: zones.value.length,
      selectedZoneId: zonesStore.selectedZoneId,
    },
    null,
    2
  );
});

// --- AUTH HANDLERS ---
const handleSignOut = async () => {
  try {
    await authStore.signOut();
  } catch (error) {
    console.error("Sign out failed:", error);
  }
};

// --- ZONE HANDLERS ---
const handleShapeDrawn = (geometry: ZoneGeometry) => {
  newZoneGeometry.value = geometry;
  zoneToEdit.value = null;
  isZoneEditorOpen.value = true;
};

const handleZoneSelected = (zoneId: string) => {
  zonesStore.selectZone(zoneId);
};

const handleEditZone = () => {
  if (!selectedZone.value) {
    console.error("No zone selected to edit.");
    return;
  }
  zoneToEdit.value = selectedZone.value; // selectedZone is already reactive
  newZoneGeometry.value = null;
  isZoneEditorOpen.value = true;
};

const handleSaveZone = async (zoneData: Omit<Zone, 'id' | 'geometry'>) => {
  try {
    if (zoneToEdit.value) {
      await zonesStore.updateZone({ id: zoneToEdit.value.id, ...zoneData });
    } else if (newZoneGeometry.value) {
      await zonesStore.createZone({ ...zoneData, geometry: newZoneGeometry.value });
    }
    closeZoneEditor();
  } catch (error) {
    console.error("Failed to save zone:", error);
  }
};

const handleDeleteZone = async () => {
  if (!selectedZone.value) {
    console.error("No zone selected to delete.");
    return;
  }
  try {
    await zonesStore.deleteZone(selectedZone.value.id);
  } catch (err) {
    console.error("Error deleting zone:", err);
  }
};

const handleDeleteZonePerson = async (person: ZonePerson) => {
  if (!selectedZone.value) {
    console.error("No zone selected to delete person from.");
    return;
  }
  try {
    await zonesStore.removePersonFromZone(selectedZone.value.id, person.id);
  } catch (err) {
    console.error("Error deleting person:", err);
  }
};

const closeZoneEditor = () => {
  isZoneEditorOpen.value = false;
  zoneToEdit.value = null;
  newZoneGeometry.value = null;
};

// --- PERSON HANDLERS ---
const handleAddPerson = () => {
  // personToEdit.value = null; // Reset person to edit
  isPersonEditorOpen.value = true;
};

const handleSavePerson = async (personData: Omit<ZonePerson, "id">) => {
  if (!selectedZone.value) {
    console.error("No zone selected to add person to.");
    return;
  }
  try {
    if( personToEdit.value) {
     
      await zonesStore.updatePersonInZone(selectedZone.value.id, personToEdit.value.id, personData);
    } else {
    
      await zonesStore.addPersonToZone(selectedZone.value.id, personData);
    }
    
    closePersonEditor();
  } catch (err) {
    console.error("Error adding person:", err);
  }
};

const handleEditPerson = (person: ZonePerson) => {
  personToEdit.value = person;
  isPersonEditorOpen.value = true;
};

const closePersonEditor = () => {
  isPersonEditorOpen.value = false;
  personToEdit.value = null;
};
</script>
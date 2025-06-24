<template>
  <div v-if="zone" class="bg-white rounded-lg shadow-lg p-4 max-w-sm">
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-lg font-semibold" :style="{ color: zone.color }">
        Zone Details
      </h3>
      <button
        class="px-3 py-1 text-sm font-medium text-primary-600 hover:text-primary-700 border border-primary-300 hover:border-primary-400 rounded-md transition-colors"
        @click="$emit('edit-zone')"
      >
      <Icon name="heroicons:pencil-square" class="w-3 h-3" />
      </button>
      <button
        class="px-3 py-1 text-sm font-medium text-red-600 hover:text-red-700 border border-red-300 hover:border-red-400 rounded-md transition-colors"
        @click.stop="$emit('delete-zone')"
      >
        <Icon name="heroicons:trash" class="w-3 h-3" />
      </button>
    </div>

    <div class="space-y-3">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
        <p class="text-sm text-gray-900">{{ zone.name }}</p>
      </div>

      <div v-if="zone.comment">
        <label class="block text-sm font-medium text-gray-700 mb-1"
          >Comment</label
        >
        <p class="text-sm text-gray-900">{{ zone.comment }}</p>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1"
          >Color</label
        >
        <div class="flex items-center space-x-2">
          <div
            class="w-4 h-4 rounded border border-gray-300"
            :style="{ backgroundColor: zone.color }"
          />
          <span class="text-sm text-gray-600">{{ zone.color }}</span>
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Type</label>
        <p class="text-sm text-gray-900 capitalize">{{ zone.geometry.type }}</p>
      </div>

      <!-- People Section -->
      <div class="border-t pt-3 mt-4">
        <div class="flex items-center justify-between mb-2">
          <label class="block text-sm font-medium text-gray-700"
            >Assigned People</label
          >
          <button
            class="px-2 py-1 text-xs font-medium text-primary-600 hover:text-primary-700 border border-primary-300 hover:border-primary-400 rounded transition-colors"
            @click="$emit('add-person')"
          >
            Assign
          </button>
        </div>

        <div v-if="loading" class="text-xs text-gray-500">
          Loading people...
        </div>

        <div
          v-else-if="people && people.length > 0"
          class="max-h-48 overflow-y-auto space-y-2 pr-2"
        >
          <div
            v-for="person in people"
            :key="person.id"
            class="bg-gray-50 rounded p-2 text-xs"
          >
            <div class="font-medium text-gray-900">{{ person.name }}</div>
            <!-- Action Buttons -->
            <div class="flex space-x-2 mt-1">
              <button
                class="flex items-center space-x-1 text-xs px-2 py-0.5 text-primary-600 hover:text-primary-700 border border-primary-300 hover:border-primary-400 rounded transition-colors"
                @click.stop="$emit('edit-person', person)"
              >
                <Icon name="heroicons:pencil-square" class="w-3 h-3" />
              </button>
              <button
                class="flex items-center space-x-1 text-xs px-2 py-0.5 text-red-600 hover:text-red-700 border border-red-300 hover:border-red-400 rounded transition-colors"
                @click.stop="$emit('delete-person', person)"
              >
                <Icon name="heroicons:trash" class="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        <div v-else class="text-xs text-gray-500 italic">
          No people assigned to this zone
        </div>
      </div>

      <div class="text-xs text-gray-500 pt-2 border-t">
        Zone ID: {{ zone.id }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Zone, ZonePerson } from "~/types/index";
import { storeToRefs } from "pinia";
import { useCollection } from "~/composables/useFirestore";
import { useAuthStore } from "~/store/auth";

interface Props {
  zone: Zone | null;
}

const props = defineProps<Props>();

defineEmits<{
  "edit-zone": [];
  "delete-zone": [];
  "add-person": [];
  "edit-person": [ZonePerson];
  "delete-person": [ZonePerson];
}>();

// Reactive data
const authStore = useAuthStore();
const { tenantId } = storeToRefs(authStore);

const people = ref<ZonePerson[]>([]);
const loading = ref(false);

// watchEffect will re-run whenever props.zone or tenantId changes
watchEffect(() => {
  // Clear people list if there's no zone or tenant
  if (!props.zone || !tenantId.value) {
    people.value = [];
    return;
  }

  // Use the composable directly here. It returns reactive refs.
  const { data: fetchedPeople, loading: fetchLoading } =
    useCollection<ZonePerson>(
      `/tenants/${tenantId.value}/zones/${props.zone.id}/people`
    );

  // Watch the refs returned by useCollection and update our local state
  watch(fetchLoading, (val) => {
    loading.value = val;
  });

  watch(fetchedPeople, (newPeople) => {
    people.value = newPeople;
  });
});
</script>
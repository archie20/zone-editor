<template>
  <UiModal :is-open="isOpen" @close="$emit('cancel')">
    <div class="p-4 sm:p-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold text-gray-900">
          {{ existingZone ? "Edit Zone" : "Create Zone" }}
        </h2>
        <button
          class="text-gray-400 hover:text-gray-600 transition-colors p-1"
          aria-label="Close modal"
          @click="$emit('cancel')"
        >
          <svg
            class="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <form class="space-y-4" @submit.prevent="handleSubmit">
        <!-- Name Field -->
        <div>
          <label for="name" class="block text-sm font-medium text-gray-700 mb-1">
            Name <span class="text-red-500">*</span>
          </label>
          <input
            id="name"
            v-model="formData.name"
            type="text"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            :class="{ 'border-red-500': errors.name }"
            placeholder="Enter zone name"
          >
          <p v-if="errors.name" class="mt-1 text-sm text-red-600">
            {{ errors.name }}
          </p>
        </div>

        <!-- Comment Field -->
        <div>
          <label
            for="comment"
            class="block text-sm font-medium text-gray-700 mb-1"
          >
            Comment
          </label>
          <textarea
            id="comment"
            v-model="formData.comment"
            rows="3"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 resize-none"
            placeholder="Optional comment"
          />
        </div>

        <!-- Color Field -->
        <div>
          <label for="color" class="block text-sm font-medium text-gray-700 mb-1">
            Color
          </label>
          <div class="flex flex-col sm:flex-row gap-2 sm:items-center">
            <input
              id="color"
              v-model="formData.color"
              type="color"
              class="w-12 h-10 rounded border border-gray-300 cursor-pointer flex-shrink-0"
            >
            <input
              v-model="formData.color"
              type="text"
              class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 min-w-0"
              placeholder="#3b82f6"
            >
          </div>
        </div>

        <!-- Geometry Info (Read-only) -->
        <div v-if="geometryInfo" class="bg-gray-50 p-3 rounded-md">
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Geometry
          </label>
          <p class="text-sm text-gray-600">{{ geometryInfo }}</p>
        </div>

        <!-- Form Actions -->
        <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            class="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            @click="$emit('cancel')"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="loading"
            class="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
          >
            {{ loading ? "Saving..." : "Save Zone" }}
          </button>
        </div>
      </form>
    </div>
  </UiModal>
</template>

<script setup lang="ts">
import { useMapStore } from "~/store/map";
import type { Zone, ZoneGeometry } from "~/types/index";

interface Props {
  isOpen: boolean;
  existingZone: Zone | null;
  newGeometry: ZoneGeometry | null;
}

interface Emits {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (e: "save", zoneData: any): void;
  (e: "cancel"): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const mapStore = useMapStore();
const loading = ref(false);
const errors = ref<Record<string, string>>({});

const formData = reactive({
  name: "",
  comment: "",
  color: mapStore.selectedColor,
});

const geometryInfo = computed(() => {
  const geometry = props.existingZone?.geometry || props.newGeometry;
  if (!geometry) return null;

  switch (geometry.type) {
    case "rectangle":
      return `Rectangle zone`;
    case "circle":
      return `Circle zone (radius: ${
        geometry.radius ? Math.round(geometry.radius) + "m" : "unknown"
      })`;
    case "polygon":
      return `Polygon zone (${geometry.coordinates?.length || 0} points)`;
    default:
      return `${(geometry as ZoneGeometry).type} zone`;
  }
});

// Initialize and watch for prop changes
const initializeForm = () => {
  if (props.existingZone) {
    formData.name = props.existingZone.name;
    formData.comment = props.existingZone.comment;
    formData.color = props.existingZone.color;
  } else {
    formData.name = "";
    formData.comment = "";
    formData.color = mapStore.selectedColor;
  }
  // Clear any existing errors
  errors.value = {};
};

onMounted(initializeForm);

// Watch for changes to existingZone or when modal opens
watch([() => props.existingZone, () => props.isOpen], () => {
  if (props.isOpen) {
    initializeForm();
  }
});

const validateForm = () => {
  errors.value = {};

  if (!formData.name.trim()) {
    errors.value.name = "Name is required";
  }

  return Object.keys(errors.value).length === 0;
};

const handleSubmit = async () => {
  if (!validateForm()) return;

  loading.value = true;

  try {
    const zoneData = {
      name: formData.name.trim(),
      comment: formData.comment.trim(),
      color: formData.color,
    };

    emit("save", zoneData);
  } catch (error) {
    console.error("Form submission error:", error);
  } finally {
    loading.value = false;
  }
};
</script>
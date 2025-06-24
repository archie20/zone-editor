<template>
  <UiModal :is-open="isOpen" @close="handleCancel">
    <div class="p-4 sm:p-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">
        {{ existingPerson ? "Edit Person" : "Add Person to Zone" }}
      </h2>

      <form @submit.prevent="handleSubmit">
        <div class="space-y-4">
          <!-- Name Field -->
          <div>
            <label
              for="name"
              class="block text-sm font-medium text-gray-700 mb-1"
            >
              Name <span class="text-red-500">*</span>
            </label>
            <input
              id="name"
              v-model="formData.name"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              :class="{ 'border-red-500': errors.name }"
              placeholder="Enter person's name"
              required
            >
            <p v-if="errors.name" class="mt-1 text-sm text-red-600">
              {{ errors.name }}
            </p>
          </div>

          <!-- Phone Field -->
          <div>
            <label
              for="phone"
              class="block text-sm font-medium text-gray-700 mb-1"
            >
              Phone
            </label>
            <input
              id="phone"
              v-model="formData.phone"
              type="tel"
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              :class="{ 'border-red-500': errors.phone }"
              placeholder="Enter phone number"
            >
            <p v-if="errors.phone" class="mt-1 text-sm text-red-600">
              {{ errors.phone }}
            </p>
          </div>

          <!-- Note Field -->
          <div>
            <label
              for="note"
              class="block text-sm font-medium text-gray-700 mb-1"
            >
              Note
            </label>
            <textarea
              id="note"
              v-model="formData.note"
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
              :class="{ 'border-red-500': errors.note }"
              placeholder="Add any additional notes..."
            />
            <p v-if="errors.note" class="mt-1 text-sm text-red-600">
              {{ errors.note }}
            </p>
          </div>
        </div>

        <!-- Form Actions -->
        <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
          <button
            type="button"
            class="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            @click="handleCancel"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="!isFormValid || isSubmitting"
            class="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="isSubmitting">Saving...</span>
            <span v-else>{{ existingPerson ? "Update Person" : "Save Person" }}</span>
          </button>
        </div>
      </form>
    </div>
  </UiModal>
</template>

<script setup lang="ts">
import type { ZonePerson } from "~/types/index";

interface Props {
  isOpen: boolean;
  existingPerson?: ZonePerson | null;
}

interface Emits {
  (e: "save", personData: Omit<ZonePerson, "id">): void;
  (e: "cancel"): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// Form data
const formData = reactive({
  name: "",
  phone: "",
  note: "",
});

// Form validation
const errors = reactive({
  name: "",
  phone: "",
  note: "",
});

const isSubmitting = ref(false);

// Computed properties
const isFormValid = computed(() => {
  return formData.name.trim().length > 0 && !hasErrors.value;
});

const hasErrors = computed(() => {
  return Object.values(errors).some((error) => error.length > 0);
});

// Validation functions
const validateName = () => {
  if (!formData.name.trim()) {
    errors.name = "Name is required";
  } else if (formData.name.trim().length < 2) {
    errors.name = "Name must be at least 2 characters long";
  } else {
    errors.name = "";
  }
};

const validatePhone = () => {
  if (formData.phone && formData.phone.trim()) {
    // Basic phone validation - adjust regex as needed
    const phoneRegex = /^[+]?[0-9][\d]{0,15}$/;
    if (!phoneRegex.test(formData.phone.replace(/[\s\-\\(\\)]/g, ""))) {
      errors.phone = "Please enter a valid phone number";
    } else {
      errors.phone = "";
    }
  } else {
    errors.phone = "";
  }
};

const validateNote = () => {
  if (formData.note.length > 500) {
    errors.note = "Note must be less than 500 characters";
  } else {
    errors.note = "";
  }
};

// Watch for changes and validate
watch(() => formData.name, validateName);
watch(() => formData.phone, validatePhone);
watch(() => formData.note, validateNote);

// Form handlers
const handleSubmit = async () => {
  // Validate all fields
  validateName();
  validatePhone();
  validateNote();

  if (!isFormValid.value) {
    return;
  }

  isSubmitting.value = true;

  try {
    const personData: Omit<ZonePerson, "id"> = {
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      note: formData.note.trim()
    };

    emit("save", personData);
  } catch (error) {
    console.error("Error preparing person data:", error);
  } finally {
    isSubmitting.value = false;
  }
};

const handleCancel = () => {
  emit("cancel");
};

const initializeForm = () => {
  if (props.existingPerson) {
    Object.assign(formData, {
      name: props.existingPerson.name,
      phone: props.existingPerson.phone,
      note: props.existingPerson.note,
    });
  } else {
    Object.assign(formData, {
      name: "",
      phone: "",
      note: "",
    });
  }

  // Clear errors
  Object.assign(errors, {
    name: "",
    phone: "",
    note: "",
  });
};

// Initialize form on mount and when modal opens or person changes
onMounted(initializeForm);

watch([() => props.existingPerson, () => props.isOpen], () => {
  if (props.isOpen) {
    initializeForm();
  }
});
</script>
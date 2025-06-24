<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4"
    role="dialog"
    aria-modal="true"
    @click="handleBackdropClick"
  >
    <!-- Backdrop -->
    <div class="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />
    
    <!-- Modal Container -->
    <div
      ref="modalRef"
      class="relative bg-white rounded-lg shadow-xl max-w-md sm:max-w-lg md:max-w-xl w-full max-h-[90vh] overflow-hidden"
      @click.stop
    >
      <!-- Modal Content -->
      <div class="overflow-y-auto">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  isOpen: boolean;
}

interface Emits {
  (e: 'close'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const modalRef = ref<HTMLElement>();

const handleBackdropClick = () => {
  emit('close');
};

// Handle escape key
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.isOpen) {
    emit('close');
  }
};

// Focus trap
const trapFocus = (e: KeyboardEvent) => {
  if (!props.isOpen || !modalRef.value) return;
  
  if (e.key === 'Tab') {
    const focusableElements = modalRef.value.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        lastElement?.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === lastElement) {
        firstElement?.focus();
        e.preventDefault();
      }
    }
  }
};

// Add/remove event listeners
onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
  document.addEventListener('keydown', trapFocus);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
  document.removeEventListener('keydown', trapFocus);
});

// Prevent body scroll when modal is open and focus management
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    document.body.style.overflow = 'hidden';
    nextTick(() => {
      // Focus first focusable element
      const firstFocusable = modalRef.value?.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement;
      firstFocusable?.focus();
    });
  } else {
    document.body.style.overflow = '';
  }
});

// Cleanup on unmount
onUnmounted(() => {
  document.body.style.overflow = '';
});
</script>
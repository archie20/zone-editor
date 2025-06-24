<!-- app.vue -->
<template>
  <div>
    <main>
      <!-- The content of your page will be rendered here -->
      <slot />
    </main>

  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/store/auth';

const authStore = useAuthStore()

onMounted(() => {
  authStore.initializeAuth()
})
</script>
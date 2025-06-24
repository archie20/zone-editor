<template>
  <div class="bg-white rounded-lg shadow-lg p-4 space-y-3">
    <h3 class="text-sm font-semibold text-gray-900">Drawing Tools</h3>
    
    <!-- Drawing Mode Buttons -->
    <div class="space-y-2">
      
      <button
        :class="[
          'w-full px-3 py-2 text-sm font-medium rounded-md transition-colors',
          drawMode === 'circle' 
            ? 'bg-primary-500 text-white' 
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        ]"
        @click="setDrawingMode('circle')"
      >
        Circle
      </button>
      
      <button
        :class="[
          'w-full px-3 py-2 text-sm font-medium rounded-md transition-colors',
          drawMode === 'polygon' 
            ? 'bg-primary-500 text-white' 
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        ]"
        @click="setDrawingMode('polygon')"
      >
        Polygon
      </button>
      
      <button
        v-if="drawMode"
        class="w-full px-3 py-2 text-sm font-medium rounded-md bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
        @click="cancelDrawing"
      >
        Cancel
      </button>
    </div>
    
    <!-- Color Picker -->
    <div class="border-t pt-3">
      <label class="block text-sm font-medium text-gray-700 mb-2">
        Zone Color
      </label>
      <div class="flex items-center space-x-2">
        <input
          v-model="localColor"
          type="color"
          class="w-8 h-8 rounded border border-gray-300 cursor-pointer"
          @change="updateColor"
        >
        <input
          v-model="localColor"
          type="text"
          class="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
          placeholder="#3b82f6"
          @input="updateColor"
        >
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMapStore } from '~/store/map'

const mapStore = useMapStore()

const { drawMode, selectedColor } = storeToRefs(mapStore)
const localColor = ref(selectedColor.value)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
watch(selectedColor, (newColor: any) => {
  localColor.value = newColor
})

const setDrawingMode = (mode: 'rectangle' | 'circle' | 'polygon') => {
  mapStore.setDrawMode(mode)
}

const cancelDrawing = () => {
  mapStore.setDrawMode(null)
}

const updateColor = () => {
  mapStore.setSelectedColor(localColor.value)
}
</script>
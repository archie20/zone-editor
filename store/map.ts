import { defineStore } from 'pinia'

export type DrawMode = 'rectangle' | 'circle' | 'polygon' | null

export const useMapStore = defineStore('map', () => {
  const drawMode = ref<DrawMode>(null)
  const selectedColor = ref<string>('#3b82f6')

  const setDrawMode = (mode: DrawMode) => {
    drawMode.value = mode
  }

  const setSelectedColor = (color: string) => {
    selectedColor.value = color
  }

  return {
    drawMode: readonly(drawMode),
    selectedColor: readonly(selectedColor),
    setDrawMode,
    setSelectedColor
  }
})
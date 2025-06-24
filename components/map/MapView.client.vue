<template>
  <div ref="mapContainer" class="w-full h-full" />
</template>

<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any */
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw/dist/leaflet.draw.css'
import 'leaflet-draw'
import { useMapStore } from '~/store/map'
import type { Zone, ZoneGeometry } from '~/types/index'
import { GeoPoint } from 'firebase/firestore'


interface Props {
  zones: Zone[]
}

interface Emits {
  (e: 'shape-drawn', geometry: ZoneGeometry): void
  (e: 'zone-selected', zone: string): void
}

const emit = defineEmits<Emits>()
const props = defineProps<Props>()


const mapStore = useMapStore()
const { drawMode, selectedColor } = storeToRefs(mapStore)

const mapContainer = ref<HTMLElement | null>(null)
let map: L.Map | null = null
let drawnItems: L.FeatureGroup | null = null

let currentDrawHandler: any = null

onMounted(() => {
  initializeMap()
})

onUnmounted(() => {
  if (map) {
    map.remove()
  }
})

const initializeMap = () => {
  if (!mapContainer.value) return

  // Initialize map
  map = L.map(mapContainer.value).setView([6.7222698, -1.4738678], 14)

  // Add tile layer
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map)

  // Initialize drawn items layer
  drawnItems = new L.FeatureGroup()
  map.addLayer(drawnItems)

  // Set up drawing handlers
  setupDrawingHandlers()
}

const setupDrawingHandlers = () => {
  if (!map || !drawnItems) return

  // Listen for draw events
  map.on(L.Draw.Event.CREATED, (event: any) => {
    const layer = event.layer
    const geometry = convertLayerToGeometry(layer, event.layerType)

    if (geometry) {
      emit('shape-drawn', geometry)
    }

    // Reset draw mode
    mapStore.setDrawMode(null)
  })
}

const convertLayerToGeometry = (layer: any, layerType: string): ZoneGeometry | null => {
  switch (layerType) {
    case 'rectangle':
      {
        const bounds = layer.getBounds()
        return {
          type: 'rectangle',
          bounds: [
            new GeoPoint(bounds.getSouth(), bounds.getWest()),
            new GeoPoint(bounds.getNorth(), bounds.getEast())
          ]
        }
      }

    case 'circle':
      {
        const center = layer.getLatLng()
        return {
          type: 'circle',
          center: new GeoPoint(center.lat, center.lng),
          radius: layer.getRadius()
        }
      }

    case 'polygon':
      {
        const coordinates = layer.getLatLngs()[0].map((latlng: L.LatLng) =>
          new GeoPoint(latlng.lat, latlng.lng)
        )
        return {
          type: 'polygon',
          coordinates
        }
      }

    default:
      return null
  }
}

// Watch for draw mode changes
watch(drawMode, (newMode: string | null) => {
  if (!map) return

  // Disable current handler
  if (currentDrawHandler) {
    currentDrawHandler.disable()
    currentDrawHandler = null
  }

  // Enable new handler based on mode
  if (newMode) {
    enableDrawingMode(newMode)
  }
})

const enableDrawingMode = (mode: string) => {
  if (!map || !drawnItems) return

  const options = {
    shapeOptions: {
      color: selectedColor.value,
      fillColor: selectedColor.value,
      fillOpacity: 0.3
    }
  }

  switch (mode) {
    case 'rectangle':
      currentDrawHandler = new L.Draw.Rectangle(map as any, options)
      break
    case 'circle':
      currentDrawHandler = new L.Draw.Circle(map as any, options)
      break
    case 'polygon':
      currentDrawHandler = new L.Draw.Polygon(map as any, options)
      break
  }

  if (currentDrawHandler) {
    currentDrawHandler.enable()
  }
}

// Watch for zones changes and render them
watch(() => props.zones, (newZones: Zone[]) => {
  renderZones(newZones)
}, { deep: true })

const renderZones = (zones: Zone[]) => {
  if (!map || !drawnItems) return

  // Clear existing zones
  drawnItems.clearLayers()

  // Render each zone
  zones.forEach(zone => {
    const layer = createLayerFromGeometry(zone.geometry, zone)
    if (layer) {

      // Add click handler
      layer.on('click', () => {
        emit('zone-selected', zone.id)
      })

      drawnItems?.addLayer(layer)
    }
  })
}

const createLayerFromGeometry = (geometry: ZoneGeometry, zone: Zone): L.Layer | null => {

  const style = {
    color: zone.color,
    fillColor: zone.color,
    fillOpacity: 0.3
  }

  switch (geometry.type) {
    case 'rectangle':
      if (geometry.bounds) {
        const [sw, ne] = geometry.bounds
        return L.rectangle([
          [sw.latitude, sw.longitude],
          [ne.latitude, ne.longitude]
        ], style)
      }
      break

    case 'circle':
      if (geometry.center && geometry.radius) {
        return L.circle([geometry.center.latitude, geometry.center.longitude], {
          radius: geometry.radius,
          ...style
        })
      }
      break

    case 'polygon':
      if (geometry.coordinates) {
        const latlngs = geometry.coordinates.map((coord: { latitude: number; longitude: number }) =>
          [coord.latitude, coord.longitude] as [number, number]
        )
        return L.polygon(latlngs, style)
      }
      break
  }

  return null
}
</script>
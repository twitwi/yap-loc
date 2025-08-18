import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { TimedPoint } from '@/utils'

export const TILE_FORMAT = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
export const CORS = 'https://cors.heeere.com/'

// More or less raw. Domain logic is in the track store.
export const useLocalStore = defineStore(
  'local',
  () => {
    // like setup() in a component
    const o = {
      enableContrib: ref(false),
      enableView: ref(false),
      enableBackup: ref(false),
      customPanelSize: ref(35), // vh
      //
      pendingContrib: ref([] as string[]),
      //
      lastLSKey: ref(''),
      lastStartTime: ref(0),
      lastRoute: ref(''),
      usedLSKeys: ref([] as string[]),
      tileFormat: ref(TILE_FORMAT),
      //
      importSharedPoints: ref(true),
      importSharedStart: ref(true),
      shareNewPoints: ref(true),
      cors: ref(CORS),
      points: ref({} as Record<string, TimedPoint[]>),
      //
      dPlusPerKm: ref(115),
      maxSpeed: ref(16),
      minSpeed: ref(3),
    }
    return o
  },
  {
    persist: { key: import.meta.env.VITE_LS_LOCAL_KEY }, // persisted in localStorage
  },
)

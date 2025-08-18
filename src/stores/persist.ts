import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { TimedPoint } from '@/utils'

export const useLocalStore = defineStore(
  'local',
  () => {
    // like setup() in a component
    const o = {
      enableContrib: ref(false),
      enableView: ref(false),
      enableBackup: ref(false),
      //
      lastLSKey: ref(''),
      lastStartTime: ref(0),
      tileFormat: ref('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'),
      //
      importSharedPoints: ref(true),
      shareNewPoints: ref(true),
      points: ref([] as TimedPoint[]),
      dPlusPerKm: ref(110),
    }
    return o
  },
  {
    persist: { key: import.meta.env.VITE_LS_LOCAL_KEY }, // persisted in localStorage
  },
)

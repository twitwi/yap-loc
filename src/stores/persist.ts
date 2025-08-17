import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useLocalStore = defineStore(
  'local',
  () => {
    // like setup() in a component
    const o = {
      enableContrib: ref(false),
      enableView: ref(false),
      enableBackup: ref(false),
      lastLSKey: ref(''),
    }
    return o
  },
  {
    persist: { key: import.meta.env.VITE_LS_LOCAL_KEY }, // persisted in localStorage
  },
)

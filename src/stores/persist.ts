import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useLocalStore = defineStore(
  'local',
  () => {
    // like setup() in a component
    return {
      enableContrib: ref(false),
      enableView: ref(false),
      enableBackup: ref(false),
      lastTrack: ref(''),
    }
  },
  {
    persist: { key: import.meta.env.VITE_LS_LOCAL_KEY }, // persisted in localStorage
  },
)

import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useLocalStore = defineStore(
  'local',
  () => {
    // like setup() in a component
    return {
      userName: ref('bob'),
    }
  },
  {
    persist: { key: import.meta.env.VITE_LS_LOCAL_KEY }, // persisted in localStorage
  },
)

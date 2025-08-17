<script lang="ts" setup>

import { useLocalStorage } from '@vueuse/core';

const props = defineProps({
  k: {
    type: String,
    default: import.meta.env.VITE_LS_LOCAL_KEY as string
  },
  placeholder: {
    type: String,
    default: 'config::value',
  },
  mode: {
    type: String,
    default: 'raw' as 'raw' | 'details',
  },
  summary: {
    type: String,
    default: 'Local storage (unfold to view/edit)',
  },
})

const lsvalue = useLocalStorage(props.k ?? '', '')

</script>
<template>
  <input v-if="mode === 'raw'" type="text" v-model="lsvalue" :placeholder="placeholder" />
  <details v-else-if="mode === 'details'">
    <summary>{{ summary }}</summary>
    <EditLocalStorageConfig style="width: 100%" />
  </details>
  <div v-else>Unknown mode {{ mode }}</div>

</template>

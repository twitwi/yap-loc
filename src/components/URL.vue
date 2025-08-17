<script setup lang="ts">
import { sprintf } from 'sprintf-js'
import { computed, inject, ref, type Ref } from 'vue';

const props = defineProps({
  format: {
    type: String,
    required: true,
  },
  moreClass: {
    type: String,
    default: '',
  }
})

const root = ref(undefined as HTMLElement | undefined)
const location = inject('location') as Ref<GeolocationPosition | undefined>

const url = computed(() => {
  if (location.value === undefined) {
    return ''
  }
  const coords = location.value.coords
  return sprintf(props.format, coords.latitude, coords.longitude)
})

async function copyURL() {
  if (!root.value) {
    return
  }
  await navigator.clipboard.writeText(url.value)
  root.value.classList.add('copied')
  setTimeout(() => root.value!.classList.remove('copied'), 500)
}

</script>
<template>
  <div :class="'url ' + moreClass" ref="root">
    <a :href="url" target="_blank">{{ url || 'waiting for location...'}}</a>
    <div class="copy" @click="copyURL()">copy</div>
  </div>
</template>

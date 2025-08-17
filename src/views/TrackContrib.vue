<script setup lang="ts">
import { useLocalStore } from '@/stores/persist'
import { useTrackStore } from '@/stores/track'
import { NButton } from 'naive-ui'
import { onMounted } from 'vue'


const track = useTrackStore()
const local = useLocalStore()

onMounted(() => {
  if (track.track === '') {
    track.setTrack(local.lastTrack)
  }
})

function promptChangeTrack() {
  const t = prompt('Enter track name', local.lastTrack)
  if (t !== null) {
    track.setTrack(t)
  }
}

</script>

<template>
  <div class="main-contrib">
    <div style="display: flex; flex-direction: column;">
      <NButton @click="track.contributeDeviceLocation()">Contribute location <span v-if="track.lskey"> ({{ track.lskey }})</span></NButton>
      <code style="font-size: 25px; text-align: center;" @click="promptChangeTrack()">{{ track.track || '(( not set ))' }}</code>
    </div>
    <ul class="debug-logs">
      <li v-for="l,il in track.logs.slice().reverse()" :key="il" :class="l.class">{{ l.text }}</li>
    </ul>
  </div>
</template>

<style>
.debug-logs {
  li {
    list-style: none;
    padding: 0.2em 1em;
    border-left: 2em solid black;
  }
  li:first-of-type { margin: 1em 0; }
  li.error { border-color: red; }
  li.pending { border-color: yellow; }
  li.done { border-color: green; }
}
</style>

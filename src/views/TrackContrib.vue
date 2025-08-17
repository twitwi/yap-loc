<script setup lang="ts">
import { useLocalStore } from '@/stores/persist'
import { useTrackStore } from '@/stores/track'
import { NButton } from 'naive-ui'

const track = useTrackStore()
const local = useLocalStore()

function promptChangeLSKey() {
  const t = prompt('Enter lskey', local.lastLSKey)
  if (t !== null) {
    track.lskey = t
  }
}

</script>

<template>
  <div class="main-contrib">
    <div style="display: flex; flex-direction: column;">
      <code style="font-size: 25px; text-align: center;" @click="promptChangeLSKey()">{{ track.track || '(( not set ))' }}</code>
      <NButton @click="track.contributeDeviceLocation()">Contribute location <span v-if="track.lskey"> ({{ track.lskey }})</span></NButton>
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

<script setup lang="ts">

import URL from '@/components/URL.vue'
import { useTrackStore } from '@/stores/track'
import { ref, onMounted, provide } from 'vue'

const track = useTrackStore()
const location = ref(undefined as GeolocationPosition | undefined)

onMounted(async () => {
  location.value = await track.getDeviceLocation()
})

provide('location', location)

</script>

<template>
  <URL format="https://www.openstreetmap.org/search?query=#map=19/%1$.4f/%2$.4f" />
  <URL more-class="pin" format="https://www.brouter.de/brouter-web/#map=14/%1$.4f/%2$.4f/OpenTopoMap&lonlats=%2$.4f,%1$.4f&profile=shortest" />
  <URL more-class="pin" format="https://graphhopper.com/maps/?point=%1$.4f,%2$.4f&point=&profile=car&layer=OpenStreetMap" />
  <URL format="http://maps.google.com/?ll=%1$.4f,%2$.4f" />
  <URL more-class="pin" format="https://maps.apple.com/directions?source=%1$.4f,%2$.4f&destination=%1$.4f5,%2$.4f5&mode=walking" />
</template>

<style>
.url {
  display: block;
  border: 3px solid black;
  &.pin {
    border-color: green;
  }
  border-radius: .2em;
  margin: 1em;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  a {
    flex-grow: 1;
    padding: 1em;
    color: black;
    &:visited {
      color: #222;
    }
  }
  .copy {
    background: black;
    color: white;
    padding: 1em;
  }
  &.copied a {
    background: #BFB;
  }
}
</style>

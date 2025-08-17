<script setup lang="ts">
import { useTrackStore } from '@/stores/track';

const track = useTrackStore()

</script>

<template>
  <div class="main-follow">
    <pre>{{ track.gpxPath }}</pre>
  </div>
</template>

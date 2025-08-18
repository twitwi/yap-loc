<script setup lang="ts">
import { useTrackStore } from '@/stores/track'
import { computed, nextTick, ref, watchEffect } from 'vue'
import 'leaflet/dist/leaflet.css'
import { Map as LeafletMap, Polyline } from 'leaflet'
import { LMap, LMarker, LPolyline, LTileLayer, LTooltip } from '@maxel01/vue-leaflet'
import type { LatLng, LatLngTuple, LeafletMouseEvent, Marker } from 'leaflet'
import { useLocalStore } from '@/stores/persist'
import { elapsedTimeToString, niceTimestamp, type TimedPoint } from '@/utils'
import { representerNearestPointsInTrack } from '@/utils-analyze'
import type { Track } from 'gpxparser'

const track = useTrackStore()
const local = useLocalStore()

const map = ref(undefined as LeafletMap | undefined)
const polyline = ref(undefined as Polyline | undefined)
const ff = ref("🔥")

function formatDistDPlus(dist: number, dPlus: number) {
  const eff = dist + dPlus / local.dPlusPerKm
  return `${dist.toFixed(1)}km, ${dPlus.toFixed(0)}D+ (${eff.toFixed(0)}${ff.value})`
}

type MarkerDescription = {
  key: string
  latlng: LatLng
  info: string
  propEnd?: number
}
const estimateMarkers = ref([] as MarkerDescription[])

watchEffect(() => {
  if (estimateMarkers.value.length === 0 && track.gpxContent) {
    const t = track.gpxContent.tracks[0]
    const p = t.points.slice(-1)[0]
    const dist = track.cumulatedDistance.slice(-1)[0] / 1000
    const dplus = track.cumulatedDPlus.slice(-1)[0]
    //const eff = dist + dplus / local.dPlusPerKm
    estimateMarkers.value.push({
      key: `end-${Math.random()}`,
      latlng: { lat: p.lat, lng: p.lon },
      info: `END: ${formatDistDPlus(dist, dplus)}<br/>ETA:`
    } as MarkerDescription)
  }
})

const reportedMarkers = computed(() => {
  const trac = track.gpxContent?.tracks[0] as Track
  if (!trac) {
    return []
  }
  const start = track.startTime
  const localPoints = local.points[track.lskey]
  if (localPoints === undefined) {
    return []
  }
  const end = Math.max(...localPoints.map(p => p.ts))
  return localPoints.slice().sort((a, b) => a.ts - b.ts).map((p: TimedPoint) => {
    const nearests = representerNearestPointsInTrack({lat: p.lat, lon: p.lon}, trac, 1.5, 30)
    const info = nearests.map(i => [track.cumulatedDistance[i] / 1000, track.cumulatedDPlus[i]])
    return {
      key: `rep-${Math.random()}`,
      latlng: { lat: p.lat, lng: p.lon },
      info: `${niceTimestamp(p.ts)}<br/>
            Temps écoulé : <b>${elapsedTimeToString(p.ts - track.startTime)}</b><br/>
            ${info.map(([dist, dplus]) => '| ' + formatDistDPlus(dist, dplus)).join('<br/>')}`,
      propEnd: (p.ts - start) / (end - start),
    } as MarkerDescription
  })
})

const gpxLatLon = computed(() => {
  if (!track.gpxContent) return [] as LatLngTuple[]
  return track.gpxContent.tracks[0].points.map((p) => [p.lat, p.lon] as LatLngTuple)
})

function fitGpx() {
  if (map.value && polyline.value) {
    map.value.fitBounds(polyline.value.getBounds())
  }
}

watchEffect(fitGpx)

function maybeAddEndAsEstimate() {
  if (polyline.value) {
    polyline.value.addEventListener('click', (ev: LeafletMouseEvent) => {
      estimateMarkers.value.push({
        key: `key${Math.random()}`,
        latlng: ev.latlng,
        info: 'test',
      })
    })
  }
}
watchEffect(maybeAddEndAsEstimate)
maybeAddEndAsEstimate()

function hookMarker(e: Marker, m: MarkerDescription, from?: MarkerDescription[], redo = true) {
  const el = e.getElement()
  if (el) {
    if (m.propEnd) {
      el.style.setProperty('--prop-end', `${m.propEnd}`)
      if (m.propEnd === 1) {
        el.classList.add(`prop${m.propEnd}`)
      }
    } else {
      el.classList.add('estimate')
    }
  } else if (redo) {
    nextTick(() => hookMarker(e, m, from, false))
  }
  if (from) {
    e.addEventListener('click', () => {
      from.splice(from.findIndex(v => v.key === m.key), 1)
    })
  }
}
</script>

<template>
  <div class="main-follow">
    <pre>{{ track.gpxPath }}</pre>
    <LMap @ready="e => map = e">
      <LTileLayer :url="local.tileFormat" />
      <LPolyline v-if="track.gpxContent" :lat-lngs="gpxLatLon" :weight="20" :opacity="0.25" color="cyan" @ready="e => polyline = e" />
      <LPolyline v-if="track.gpxContent" :lat-lngs="gpxLatLon" :weight="2" :opacity="0.75" color="darkred" :interactive="false" />
      <LMarker v-for="m in estimateMarkers" :key="m.key" :lat-lng="m.latlng" @ready="e => hookMarker(e, m, estimateMarkers)" :z-index-offset="10000">
        <LTooltip :options="{ permanent: true }"><div v-html="m.info"></div></LTooltip>
      </LMarker>
      <LMarker v-for="m,im in reportedMarkers" :key="m.key" :lat-lng="m.latlng" @ready="e => hookMarker(e, m)" :zIndexOffset="im*10">
        <LTooltip><div v-html="m.info"></div></LTooltip>
      </LMarker>
    </LMap>
    <div>footer</div>
  </div>
</template>

<style>
.main-follow {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;

  .leaflet-marker-icon {
    &:not(.prop1):not(.estimate) {
      opacity: 1;
      filter: grayscale(calc(1 - 1 * var(--prop-end)));
    }
    &.prop1 {
      filter: brightness(150%);
    }
    &.estimate {
      filter: hue-rotate(150deg);
    }
  }
}
</style>

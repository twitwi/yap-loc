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
import { NButton, NButtonGroup, NIcon } from 'naive-ui'
import { AreaChartTwotone, KeyboardDoubleArrowDownSharp, TableRowsTwotone } from '@vicons/material'

const track = useTrackStore()
const local = useLocalStore()

const map = ref(undefined as LeafletMap | undefined)
const polyline = ref(undefined as Polyline | undefined)
const ff = ref("🔥")
const bottom = ref('table' as 'none' | 'table' | 'profile')
const selectedTs = ref(0)
const currentTs = ref(0)

function formatDistDPlus(dist: number, dPlus: number) {
  const eff = dist + dPlus / local.dPlusPerKm
  return `${dist.toFixed(1)}km, ${dPlus.toFixed(0)}D+ (${eff.toFixed(0)}${ff.value})`
}

type MarkerDescription = {
  key: string
  latlng: LatLng
  ts?: number
  info: string
  selected?: boolean
  propEnd?: number
}
const estimateMarkers = ref([] as MarkerDescription[])

function maybeAddEndAsEstimate() {
  if (estimateMarkers.value.length === 0 && track.gpxContent) {
    const t = track.gpxContent.tracks[0]
    const p = t.points.slice(-1)[0]
    const dist = track.cumulatedDistance.slice(-1)[0] / 1000
    const dplus = track.cumulatedDPlus.slice(-1)[0]
    estimateMarkers.value.push({
      key: `end-${Math.random()}`,
      latlng: { lat: p.lat, lng: p.lon },
      info: `END: ${formatDistDPlus(dist, dplus)}<br/>ETA:`
    } as MarkerDescription)
  }
}
watchEffect(maybeAddEndAsEstimate)

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
      ts: p.ts,
      selected: p.ts === selectedTs.value,
      info: `${niceTimestamp(p.ts)}<br/>
            Temps écoulé : <b>${elapsedTimeToString(p.ts - track.startTime)}</b><br/>
            ${info.map(([dist, dplus]) => '| ' + formatDistDPlus(dist, dplus)).join('<br/>')}`,
      propEnd: (p.ts - start) / (end - start),
    } as MarkerDescription
  })
})

const tableHasPessimisticColumn = computed(() => Math.max(...track.tableRows.map(r => r.distAlt !== undefined ? 1 : 0)) > 0)

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

watchEffect(() => {
  if (polyline.value) {
    polyline.value.addEventListener('click', (ev: LeafletMouseEvent) => {
      estimateMarkers.value.push({
        key: `key${Math.random()}`,
        latlng: ev.latlng,
        info: 'test',
      })
    })
  }
})

function hookMarker(e: Marker, m: MarkerDescription, from?: MarkerDescription[], redo = true) {
  const el = e.getElement()
  if (el) {
    console.log(m.ts, selectedTs.value)
    if (m.selected) {
      el.classList.add('selected')
    }
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
  } else {
    e.addEventListener('click', () => {
      if (m.ts) {
        selectedTs.value = m.ts
      }
    })
  }
}
</script>

<template>
  <div class="main-follow">
    <component :is="'style'">:root { --custom-panel-size: {{ local.customPanelSize }}vh; }</component>
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
    <div :class="{ bottom: true, [`bottom-${bottom}`]: true}">
      <div v-if="bottom === 'table'" class="panel">
        <table>
          <thead>
            <tr>
              <th>Heure</th>
              <th>Latitude</th>
              <th>Longitude</th>
              <th v-if="tableHasPessimisticColumn">Au pire</th>
              <th :colspan="tableHasPessimisticColumn ? 1 : 2">Au mieux</th>
            </tr>
            </thead>
          <tbody>
            <tr v-for="r in track.tableRows" :key="r.ts" :class="{ start: r.start, selected: selectedTs === r.ts, current: currentTs === r.ts }" @click="selectedTs = r.ts">
              <td>
                <i>(start)</i>
                {{ niceTimestamp(r.ts) }}
              </td>
              <td>{{ r.lat }}</td>
              <td>{{ r.lon }}</td>
              <td v-if="r.distAlt">
                {{ Math.round(r.distAlt) }}km, {{ Math.round(r.dplusAlt!) }}D+ ({{
                  r.velAlt!.toFixed(1)
                }}km/h) ({{
                  (((r.distAlt + r.dplusAlt! / local.dPlusPerKm) / r.elapsed) * 1000 * 3600).toFixed(1)
                }}{{ff}}/h)
              </td>
              <td v-if="r.dist" :colspan="r.distAlt ? 1 : 2">
                {{ Math.round(r.dist) }}km, {{ Math.round(r.dplus) }}D+ ({{
                  r.vel.toFixed(1)
                }}km/h) ({{
                  (((r.dist + r.dplus / local.dPlusPerKm) / r.elapsed) * 1000 * 3600).toFixed(1)
                }}{{ff}}/h)
              </td>
              <td v-else :colspan="2"></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="bottom === 'profile'" class="panel">
        TODO
      </div>
      <NButtonGroup class="bar" size="small">
        <NButton @click="bottom = bottom === 'table' ? 'none' : 'table'"><NIcon><TableRowsTwotone /></NIcon></NButton>
        <NButton @click="bottom = 'none'" style="flex: 20"><NIcon><KeyboardDoubleArrowDownSharp /></NIcon></NButton>
        <NButton @click="bottom = bottom === 'profile' ? 'none' : 'profile'"><NIcon><AreaChartTwotone /></NIcon></NButton>
      </NButtonGroup>
    </div>
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
      opacity: .75;
      filter: grayscale(calc(1 - 1 * var(--prop-end)));
      &.selected {
        outline: 5px solid darkred;
      }
    }
    &.prop1 {
      filter: brightness(150%);
    }
    &.estimate {
      filter: hue-rotate(150deg);
    }
  }
}
.bottom {
  position: absolute;
  background: white;
  z-index: 1000;
  opacity: 0.9;
  left: 0;
  bottom: 0;
  width: 100%;
  --panel-size: 0;
  height: calc(var(--panel-size) + 2em);
  &:not(.bottom-none) {
    --panel-size: var(--custom-panel-size);
  }
  .panel {
    height: var(--panel-size);
    overflow-y: scroll;
  }
  .bar {
    width: 100%;
    display: flex;

    & > * {
      flex: 100;
    }
  }
}
.bottom-table {
  table, th, td {
    border: 1px solid black;
    border-collapse: collapse;
  }
  th, td {
    padding-left: 1em;
    padding-right: 1em;
    text-align: center;
  }
  table {
    margin: auto;
  }
  tr.selected td {
    background: #FEE;
    &:first-of-type {
      background-color: #FCC;
    }
  }
  tr.current td:first-of-type {
    color: teal;
  }
  tr i {
    font-size: .75em;
  }
  tr:not(.start) i {
    visibility: hidden;
  }
}
</style>

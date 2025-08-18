<script setup lang="ts">
import { useTrackStore, type TableRow } from '@/stores/track'
import { computed, nextTick, ref, watchEffect } from 'vue'
import 'leaflet/dist/leaflet.css'
import { Map as LeafletMap, Polyline } from 'leaflet'
import { LMap, LMarker, LPolyline, LTileLayer, LTooltip } from '@maxel01/vue-leaflet'
import type { LatLng, LatLngTuple, LeafletMouseEvent, LeafletMouseEventHandlerFn, Marker } from 'leaflet'
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
const bottom = ref('none' as 'none' | 'table' | 'profile')
const selectedTs = ref(0)
const currentTs = ref(0)

function formatDistDPlus(dist: number, dPlus: number) {
  const eff = dist + dPlus / local.dPlusPerKm
  return `${dist.toFixed(1)}km, ${dPlus.toFixed(0)}D+ (${eff.toFixed(0)}${ff.value})`
}

function formatTimeRacetimeDistDPlus(start: number, ts: number, distDPlus: [number, number][], estimate = false) {
  return (
    estimate ?
    `<b>ETA ${niceTimestamp(ts)}</b><br/> └─ Écoulé : ${elapsedTimeToString(ts - start)}<br/>` :
    `${niceTimestamp(ts)}<br/> └─ Écoulé : <b>${elapsedTimeToString(ts - start)}</b><br/>`
  ) + `${distDPlus.map(([dist, dplus]) => ' └─ ' + formatDistDPlus(dist, dplus)).join('<br/>')}`
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
    const info = nearests.map(i => [track.cumulatedDistance[i] / 1000, track.cumulatedDPlus[i]] as [number, number])
    return {
      key: `rep-${Math.random()}`,
      latlng: { lat: p.lat, lng: p.lon },
      ts: p.ts,
      selected: p.ts === selectedTs.value,
      info: formatTimeRacetimeDistDPlus(track.startTime, p.ts, info),
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

let lastEventListener = undefined as LeafletMouseEventHandlerFn | undefined
watchEffect(() => { // update estimateMarkers
  if (polyline.value && track.firstGpxTrack) {
    const trac = track.firstGpxTrack
    const cumulatedDistance = track.cumulatedDistance
    const cumulatedDPlus = track.cumulatedDPlus
    const rows = track.tableRows
    const dppkm = local.dPlusPerKm
    const startTime = track.startTime

    if (lastEventListener) {
      polyline.value.removeEventListener('click', lastEventListener)
    }
    lastEventListener = (ev: LeafletMouseEvent) => {
      const nearests = representerNearestPointsInTrack({lat: ev.latlng.lat, lon: ev.latlng.lng}, trac, 1.5, 30)
      const strains = nearests.map(i => [i, cumulatedDistance[i] / 1000 + cumulatedDPlus[i] / dppkm])
      const getStrain = (r: TableRow) => r.start ? 0 : r.dist + r.dplus / dppkm
      let info = 'No information yet'

      if (rows.length === 0 || rows[0].start) {
      } else {
        const times = strains.map(([i, s]) => {
          let iafter = rows.length - 1
          for (; iafter >= 0 ; iafter--) {
            if (s < getStrain(rows[iafter])) {
              break
            }
          }
          if (iafter === -1) {
            const r = rows[0]
            const currentStrainPerTime = getStrain(r) / r.elapsed
            return [i, startTime + s / currentStrainPerTime]
          } else {
            const r1 = rows[iafter+1]
            const r2 = rows[iafter]
            const s1 = getStrain(r1)
            const s2 = getStrain(r2)
            const t1 = r1.elapsed || 0
            const t2 = r2.elapsed || 0
            return [i, startTime + t1 + (s-s1) / (s2-s1) * (t2-t1)]
          }
        })
        info = times.map(([i, ts]) => formatTimeRacetimeDistDPlus(startTime, ts, [[cumulatedDistance[i] / 1000, cumulatedDPlus[i]]], true)).join('<br/>')
      }

      estimateMarkers.value.push({
        key: `key${Math.random()}`,
        latlng: ev.latlng,
        info,
      })
    }
    polyline.value.addEventListener('click', lastEventListener)
  }
})

function maybeAddEndAsEstimate() {
  if (estimateMarkers.value.length === 0 && track.firstGpxTrack && !track.tableRows[0].start) {
    const t = track.firstGpxTrack
    const p = t.points.slice(-1)[0]
    const dist = track.cumulatedDistance.slice(-1)[0] / 1000
    const dplus = track.cumulatedDPlus.slice(-1)[0]
    const strain = dist + dplus / local.dPlusPerKm
    const r = track.tableRows[0]
    const getStrain = (r: TableRow) => r.start ? 0 : r.dist + r.dplus / local.dPlusPerKm
    const currentStrainPerTime = getStrain(r) / r.elapsed
    const i = t.points.length - 1
    const ts = track.startTime + strain / currentStrainPerTime
    const info = formatTimeRacetimeDistDPlus(track.startTime, ts, [[track.cumulatedDistance[i] / 1000, track.cumulatedDPlus[i]]], true)

    estimateMarkers.value.push({
      key: `end-${Math.random()}`,
      latlng: { lat: p.lat, lng: p.lon },
      info: `(END) ${info}`,
    } as MarkerDescription)
  }
}
watchEffect(maybeAddEndAsEstimate)



function hookMarker(e: Marker, m: MarkerDescription, from?: MarkerDescription[], redo = true) {
  const el = e.getElement()
  if (el) {
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
              <th v-if="tableHasPessimisticColumn">Au pire</th>
              <th :colspan="tableHasPessimisticColumn ? 1 : 2">Au mieux</th>
              <th>Lat,Lon</th>
            </tr>
            </thead>
          <tbody>
            <tr v-for="r in track.tableRows" :key="r.ts" :class="{ start: r.start, selected: selectedTs === r.ts, current: currentTs === r.ts }" @click="selectedTs = r.ts">
              <td>
                <i>(start)</i>
                {{ niceTimestamp(r.ts) }}
              </td>
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
              <td class="latlon">{{ r.lat }}, {{  r.lon }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="bottom === 'profile'" class="panel">
        TODO
      </div>
      <NButtonGroup class="bar" size="medium">
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
    }
    &.selected {
      outline: 5px solid darkred;
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
  height: calc(var(--panel-size) + 3em);
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
    height: 3em;

    & > * {
      flex: 100;
    }
  }
}
.bottom-table {
  table {
    margin: 1em;
  }
  table, th, td {
    border: 1px solid black;
    border-collapse: collapse;
  }
  th, td {
    padding-left: 1em;
    padding-right: 1em;
    text-align: center;
  }
  td.latlon {
    font-size: 0.6em;
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

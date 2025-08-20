<script setup lang="ts">
import { useTrackStore, type TableRow } from '@/stores/track'
import { computed, nextTick, ref, useTemplateRef, watchEffect } from 'vue'
import 'leaflet/dist/leaflet.css'
import { Map as LeafletMap, Polyline } from 'leaflet'
import { LMap, LMarker, LPolyline, LTileLayer, LTooltip } from '@maxel01/vue-leaflet'
import type { LatLng, LatLngTuple, LeafletMouseEvent, LeafletMouseEventHandlerFn, Marker } from 'leaflet'
import { useLocalStore } from '@/stores/persist'
import { elapsedTimeToString, niceTimestamp, type TimedPoint } from '@/utils'
import { argMax, argMin, representerNearestPointsInTrack } from '@/utils-analyze'
import { NButton, NButtonGroup, NIcon } from 'naive-ui'
import { AreaChartTwotone, KeyboardDoubleArrowDownSharp, TableRowsTwotone } from '@vicons/material'
import { useElementSize } from '@vueuse/core'

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

function formatProgressTableCell(elapsed: number, dist: number, dplus: number, vel: number) {
  const f = ff.value
  const strain = dist + dplus / local.dPlusPerKm
  const strainPerHour = (strain / (elapsed / 1000 / 3600)).toFixed(1)
  dist = Math.round(dist)
  dplus = Math.round(dplus)
  return `${dist}km, ${dplus}D+, ${strain.toFixed(0)}${f}<br/>(${vel.toFixed(1)}km/h, ${strainPerHour}${f}/h)`

}

type MarkerDescription = {
  key: string
  latlng: LatLng
  ts?: number
  info: string
  selected?: boolean
  propEnd?: number
  distForProfile?: number
}

const reportedMarkers = computed(() => {
  const trac = track.firstGpxTrack
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

const profileSVG = useTemplateRef('profileSVG')
const { width: profileWidth, height: profileHeight } = useElementSize(profileSVG)
const profileMargin = [1, 200]
const profile = computed(() => {
  if (!track.firstGpxTrack?.points) {
    return { W: 0, H: 0, path: '', points: [], estimates: []}
  }
  const M = profileMargin
  const gpxPoints = track.firstGpxTrack.points
  const maxTs = Math.max(...track.tableRows.map(({ts}) => ts))
  const maxDist = track.cumulatedDistance.slice(-1)[0]/1000
  const mapDist = (d: number) => (d + M[0])/(2*M[0] + maxDist) * W
  const altitude = gpxPoints.map(p => p.ele)
  const minAlt = altitude[argMin(altitude)]
  const maxAlt = altitude[argMax(altitude)]
  const mapAlt = (alt: number) => H - H * (alt - (minAlt-M[1]) ) / (2*M[1] + maxAlt - minAlt)
  const W = profileWidth.value
  const H = profileHeight.value
  const path = (
    `M${mapDist(0)},${H} ` +
    track.cumulatedDistance
    .map((d, i) => [d/1000, altitude[i]])
    .filter(o => o[1] !== null)
    .map(([d, alt]) => `${mapDist(d)},${mapAlt(alt)}`)
    .join(' L')
    + ` L${mapDist(maxDist)},${H}`
  )
  const points = track.tableRows.map(({dist, ts, start}) => ({
    ts, start,
    propEnd: ts / maxTs,
    path: `M${mapDist(dist)},0 l0,${H}`,
  }))
  const estimates = estimateMarkers.value.map(({key, distForProfile}, i) => ({
    key,
    path: `M${mapDist(distForProfile!)},0 l0,${H}`,
    onclick() {
      local.estimateLocations[track.lskey].splice(i, 1)
    }
  }))
  return { W, H, path, points, estimates }
})

function clickProfile(ev: MouseEvent, M = profileMargin) {
  const rect = profileSVG.value!.getBoundingClientRect()
  const propX = (ev.clientX - rect.left) / rect.width
  const maxDist = track.cumulatedDistance.slice(-1)[0]/1000
  const dist = propX * (2*M[0] + maxDist) - M[0]
  const i = track.cumulatedDistance.findIndex(d => d/1000 >= dist)
  const p = track.firstGpxTrack!.points[i]
  const maybeClose = estimateMarkers.value.findIndex(m => Math.abs(m.distForProfile! - dist) < 1)
  if (maybeClose === -1) {
    local.estimateLocations[track.lskey].push({ lat: p.lat, lng: p.lon } as LatLng)
  } else {
    local.estimateLocations[track.lskey].splice(maybeClose, 1)
  }
}

const tableHasPessimisticColumn = computed(() => Math.max(...track.tableRows.map(r => r.distAlt !== undefined ? 1 : 0)) > 0)

const gpxLatLon = computed(() => {
  if (!track.firstGpxTrack?.points) return [] as LatLngTuple[]
  return track.firstGpxTrack.points.map((p) => [p.lat, p.lon] as LatLngTuple)
})

function fitGpx() {
  if (map.value && polyline.value) {
    map.value.fitBounds(polyline.value.getBounds())
  }
}

watchEffect(fitGpx)

let lastEventListener = undefined as LeafletMouseEventHandlerFn | undefined
watchEffect(() => { // click listener to add estimate location
  if (polyline.value && track.firstGpxTrack) {
    if (lastEventListener) {
      polyline.value.removeEventListener('click', lastEventListener)
    }
    lastEventListener = (ev: LeafletMouseEvent) => {
      local.estimateLocations[track.lskey].push(ev.latlng)
    }
    polyline.value.addEventListener('click', lastEventListener)
  }
})
const estimateMarkers = computed(() => {
  if (!track.firstGpxTrack) {
    return []
  }
  const res = [] as MarkerDescription[]
  if (track.firstGpxTrack) {
    const trac = track.firstGpxTrack
    const cumulatedDistance = track.cumulatedDistance
    const cumulatedDPlus = track.cumulatedDPlus
    const rows = track.tableRows
    const dppkm = local.dPlusPerKm
    const startTime = track.startTime

    const maybeEnd = [] as LatLng[]
    const locations = local.estimateLocations[track.lskey]
    if (locations.length === 0 && !rows[0].start) {
      const p = trac.points.slice(-1)[0]
      maybeEnd.push({ lat: p.lat, lng: p.lon } as LatLng)
    }

    for (const latlng of [...locations, ...maybeEnd]) {
      const nearests = representerNearestPointsInTrack({lat: latlng.lat, lon: latlng.lng}, trac, 1.5, 30)
      const strains = nearests.map(i => [i, cumulatedDistance[i] / 1000 + cumulatedDPlus[i] / dppkm])
      const getStrain = (r: TableRow) => r.start ? 0 : r.dist + r.dplus / dppkm
      let info = 'No information yet'
      let distForProfile = 0

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
        distForProfile = Math.min(...times.map(([i]) => cumulatedDistance[i]/1000))
      }

      if (maybeEnd.includes(latlng)) {
        info = `[end] ${info}`
      }

      res.push({
        key: `key${Math.random()}`,
        latlng: latlng,
        info,
        distForProfile,
      })
    }
  }
  return res
})

function hookMarker(e: Marker, m: MarkerDescription, isEstimate = false, redo = true) {
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
    nextTick(() => hookMarker(e, m, isEstimate, redo))
  }
  if (isEstimate) {
    e.addEventListener('click', () => {
      local.estimateLocations[track.lskey].splice(estimateMarkers.value.findIndex(v => v.key === m.key), 1)
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
    <LMap v-if="track.firstGpxTrack" @ready="e => map = e">
      <LTileLayer :url="local.tileFormat" />
      <LPolyline v-if="track.gpxContent" :lat-lngs="gpxLatLon" :weight="20" :opacity="0.25" color="cyan" @ready="e => polyline = e" />
      <LPolyline v-if="track.gpxContent" :lat-lngs="gpxLatLon" :weight="2" :opacity="0.75" color="darkred" :interactive="false" />
      <LMarker v-for="m in estimateMarkers" :key="m.key" :lat-lng="m.latlng" @ready="e => hookMarker(e, m, true)" :z-index-offset="10000">
        <LTooltip :options="{ permanent: true }"><div v-html="m.info"></div></LTooltip>
      </LMarker>
      <LMarker v-for="m,im in reportedMarkers" :key="m.key" :lat-lng="m.latlng" @ready="e => hookMarker(e, m)" :zIndexOffset="im*10">
        <LTooltip><div v-html="m.info"></div></LTooltip>
      </LMarker>
    </LMap>
    <div :class="{ bottom: true, [`bottom-${bottom}`]: true}">
      <div v-if="bottom === 'table'" class="panel">
        <input type="checkbox" id="widetablecb" style="display: none;" />
        <table>
          <thead>
            <tr>
              <th><label for="widetablecb">Heure</label></th>
              <th v-if="tableHasPessimisticColumn">Au pire</th>
              <th :colspan="tableHasPessimisticColumn ? 1 : 2">Au mieux</th>
              <th class="latlon">Lat,Lon</th>
            </tr>
            </thead>
          <tbody>
            <tr v-for="r in track.tableRows" :key="r.ts" :class="{ start: r.start, selected: selectedTs === r.ts, current: currentTs === r.ts }" @click="selectedTs = r.ts">
              <td>
                <i>(start)</i> 
                <span v-html="niceTimestamp(r.ts).replace(/ /, '<br/><i>(start)</i> ')"></span>
              </td>
              <td v-if="r.distAlt" v-html="formatProgressTableCell(r.elapsed, r.distAlt, r.dplusAlt!, r.velAlt!)"></td>
              <td v-if="r.dist" :colspan="r.distAlt ? 1 : 2" v-html="formatProgressTableCell(r.elapsed, r.dist, r.dplus, r.vel)"></td>
              <td v-else :colspan="2"></td>
              <td class="latlon">{{ r.lat }},<br/>{{  r.lon }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="bottom === 'profile'" class="panel profile">
        <svg :view-box="`0 0 ${profile.W} ${profile.H}`" style="width: 100%; height: 100%;" ref="profileSVG">
          <path v-for="m in profile.points" :key="m.ts" :d="m.path" :style="{ ['--prop-end']: m.propEnd }" :class="{ prop1: m.propEnd === 1, marker: true, start: m.start, selected: selectedTs === m.ts, current: currentTs === m.ts }" />
          <path v-for="m in profile.estimates" :key="`click-${m.key}`" @click="m.onclick()" :d="m.path" class="forclick" />
          <path v-for="m in profile.estimates" :key="m.key" @click="m.onclick()" :d="m.path" :class="{ marker: true, estimate: true }" />
          <path class="prof" :d="profile.path" @click="ev => clickProfile(ev)"></path>
        </svg>
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
  --panel-size: 0;
  --bar-size: calc(3em + 3px);
  height: calc(100% - var(--bar-size));
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
  bottom: 2px;
  width: 100%;
  height: calc(var(--panel-size) + var(--bar-size));
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
    height: var(--bar-size);

    & > * {
      flex: 100;
    }
  }
}
.bottom-table {
  :checked ~ table br {
    display: none;
  }
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
  :is(th,td).latlon {
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
.profile svg {
  .prof {
    fill: darkslategray;
  }
  .forclick {
    stroke: #8882;
    stroke-width: 10px;
  }
  .marker {
    stroke: #2880caff;
    stroke-width: 2px;
    &:not(.prop1):not(.estimate) {
      opacity: .75;
      filter: grayscale(calc(1 - 1 * var(--prop-end)));
    }
    &.selected {
      outline: 5px solid #8007;
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

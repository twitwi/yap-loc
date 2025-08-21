import { appendSharedContent, countKeysAmong, getProtectedTextURL, getSharedContent, getURLParams, guessTimestamp, loadGpx, lskeyToDocid, niceTimestamp, parseTimedPoint, removeURLParams, safeHTMLText } from "@/utils"
import { defineStore } from "pinia"
import { computed, markRaw, ref, watchEffect } from "vue"
import { useLocalStore } from "./persist"
import { computeCumulatedDPlus, representerNearestPointsInTrack } from "@/utils-analyze"
import router from "@/router"
import type { GpxParser } from "@/gpxparser"

export type DebugLog = {
  text: string
  class?: string
}

export type TableRow = {
  ts: number // ms
  lat: number
  lon: number
  start?: boolean
  elapsed: number // ms
  dist: number // km
  dplus: number // m
  vel: number // km/h
  // for alternative possibility
  distAlt?: number
  dplusAlt?: number
  velAlt?: number
}

export const useTrackStore = defineStore(
  'track',
  () => {
    // like setup() in a component
    const local = useLocalStore()

    const data = {
      lskey: ref(local.lastLSKey), // e.g. 25eb or 25eb@bob
      startTime: ref(local.lastStartTime), // milliseconds epoch
      baseURL: ref(window.location.origin + window.location.pathname),
      logs: ref([] as DebugLog[]),
      gpxContent: ref(undefined as GpxParser | undefined),
    }
    const o = {
      ...data,

      track: computed(() => data.lskey.value.split('@')[0]),
      gpxPath: computed((() => `gpx/${o.track.value}.gpx`) as () => string),
      baseURLWithATrack: computed((() => data.baseURL.value + '?A=' + o.lskey.value) as () => string),
      sharedURLlink: computed(() => getProtectedTextURL(lskeyToDocid(data.lskey.value), false, false, true)),
      firstGpxTrack: computed(() => data.gpxContent.value?.tracks?.[0]),
      cumulatedDistance: computed((() => {
        if (!o.firstGpxTrack.value) {
          return []
        }
        return o.firstGpxTrack.value.distance.cumul
      }) as () => number[]),
      cumulatedDPlus: computed((() => {
        if (!o.firstGpxTrack.value) {
          return []
        }
        return computeCumulatedDPlus(o.firstGpxTrack.value)
      }) as () => number[]),
      tableRows: computed((() => {
        if (!o.firstGpxTrack.value) {
          return []
        }
        const cumulatedDistance = o.cumulatedDistance.value
        const cumulatedDPlus = o.cumulatedDPlus.value
        const startTime = o.startTime.value
        const track = o.firstGpxTrack.value
        const points = local.points[o.lskey.value]
        let hypothesis = points.map(p => representerNearestPointsInTrack(p, track, 1.5, 30))
        let lastWithoutEmpty = hypothesis
        const hasEmpty = () => hypothesis.findIndex(h => h.length === 0) !== -1
        const rememberIfNotEmpty = () => {
          if (!hasEmpty()) {
            lastWithoutEmpty = hypothesis
          }
        }
        // remove any candidate that does not comply with the speed limits
        hypothesis = hypothesis.map((h, i) => h.filter( ind => {
        const p = points[i]
        const elapsed = p.ts - startTime // ms
        // we keep the points acquired before the start but we will need to handle them
        if (elapsed < 0) {
          return true
        }
        const v = cumulatedDistance[ind] / 1000 / (elapsed / 1000 / 3600)
        // we ignore the lower speed limit at the beginning (30min), in case the race starts a little late
        if (elapsed < 30*60) {
          return v < local.maxSpeed
        }
        return v > local.minSpeed && v < local.maxSpeed
      }))
      rememberIfNotEmpty()

      // for the before-the-start points, we fake their closest index as being the start point
      hypothesis = hypothesis.map((h, i) => {
        const p = points[i]
        const elapsed = p.ts - startTime
        if (elapsed < 0) {
          return [0]
        }
        return h
      })
      rememberIfNotEmpty()

      { // remove all incoherent points (that come before in the track than the previous one)
        const minH = hypothesis.map(h => Math.min(...h))
        hypothesis = hypothesis.map((h, i) => h.filter(ind => i===hypothesis.length-1 || ind <= minH[i+1]))
      }
      rememberIfNotEmpty()

      // fill in the information for the rendering
      let res = [] as TableRow[]
      lastWithoutEmpty.forEach((h, i) => {
        const p = points[i]
        const elapsed = p.ts - startTime // ms
        const row = { ...p, elapsed } as Partial<TableRow>
        let ind = h[h.length-1]
        row.dist = cumulatedDistance[ind] / 1000 // km
        row.vel = row.dist / (elapsed / 1000 / 3600) // km/h
        row.dplus = cumulatedDPlus[ind]
        if (h.length > 1) {
          ind = h[0]
          row.distAlt = cumulatedDistance[ind] / 1000 // km
          row.velAlt = row.distAlt / (elapsed / 1000 / 3600) // km/h
          row.dplusAlt = cumulatedDPlus[ind]
        }
        res.push(row as TableRow)
      })

      { // insert fake (start) point
        const p0 = track.points[0]
        res = [
          ...res.filter(p => p.elapsed <= 0).map(p => ({...p, start: true})),
          { lat: p0.lat, lon: p0.lon, ts: startTime, elapsed: 0, dist: 0, dplus: 0, vel: 0, start: true },
          ...res.filter(p => p.elapsed > 0).map(p => ({...p, start: false})),
        ]
      }
      res.sort((a, b) => b.ts - a.ts)
      return res
      }) as () => TableRow[]),

      contributeURL(lat: number, lon: number, ts: number) {
        let res = o.baseURLWithATrack.value
        res += `,${lat.toFixed(4)},${lon.toFixed(4)},${ts}`
        return res
      },

      async contributeDeviceLocation() {
        try {
          const pos = await o.getDeviceLocation()
          const tsec = Math.round(pos.timestamp / 1000)
          const ts = tsec * 1000
          const { latitude, longitude } = pos.coords
          const fix = (v: number) => parseFloat(v.toFixed(4))
          local.points[o.lskey.value].push({ ts, lat: fix(latitude), lon: fix(longitude) })
          const url = o.contributeURL(latitude, longitude, tsec)
          data.logs.value.push({ class: 'pending', text: url })
          const chunk = niceTimestamp(tsec * 1000) + '\n' + url + '\n'
          try {
            const content = await appendSharedContent(o.lskey.value, chunk)
            if (data.logs.value.slice(-1)[0].text === url) {
              data.logs.value.splice(-1, 1)
            }
            data.logs.value.push({ class: 'done', text: url })
            if (local.importSharedPoints) {
              await this.loadSharedPoints(content)
            }
          } catch (e) {
            local.pendingContrib.push(chunk)
            const ee = e as Record<string, string>
            data.logs.value.push({ class: 'error pending', text: safeHTMLText(ee.message) + '… saved as pending' })
          }
        } catch (e) {
          const ee = e as Record<string, string>
          data.logs.value.push({ class: 'error', text: safeHTMLText(ee.message) })
        }
      },

      async sendPendingContrib() {
        const l = local.pendingContrib.length
        if (l === 0) {
          return
        }
        const chunks = local.pendingContrib.join('\n')
        try {
          const content = await appendSharedContent(o.lskey.value, chunks)
          if (l !== local.pendingContrib.length) {
            data.logs.value.push({ class: 'error', text: `${l} pending contributions sent but size changed so we might loose last contrib?` })
          } else {
            data.logs.value.push({ class: 'done', text: `${l} pending contributions sent.` })
          }
          local.pendingContrib.splice(0, l)
          if (local.importSharedPoints) {
            await this.loadSharedPoints(content)
          }
        } catch (e) {
          const ee = e as Record<string, string>
          data.logs.value.push({ class: 'error', text: safeHTMLText(ee.message) })
        }
      },

      /*async*/ getDeviceLocation() {
        return new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            // enableHighAccuracy: true, // <- timeouting in firefox mobile...
            timeout: 15000,
            maximumAge: 10000,
          })
        })
      },

      async loadSharedPoints(content?: string) {
        const lskey = data.lskey.value
        const res = []
        try {
          const sharedContent = content ? content : await getSharedContent(o.lskey.value)
          const isBaseURLOk = (l: string) => l.startsWith(o.baseURL.value) || l.startsWith('https://twitwi.github.io/cap_nn/')
          for (const l of sharedContent.split("\n").filter(isBaseURLOk)) {
            const p = getURLParams(new URL(l))
            if (countKeysAmong(p, "lat", "lon", "at") == 3 && p.lskey === lskey) {
              const ts = guessTimestamp(p.at)
              if (res.map((p) => p.ts).indexOf(ts) === -1) {
                res.push(parseTimedPoint (`${ts}`, p.lat, p.lon))
              }
              if ('start' in p && local.importSharedStart) {
                o.startTime.value = guessTimestamp(p.start)
              }
            }
          }
          for (const p of res) {
            if (local.points[lskey].findIndex(p2 => p2.ts === p.ts) === -1) {
              local.points[lskey].push(p)
            }
          }
        } catch (e) {
          // e.g. cors limitations, no network
          console.log("GET SHARED FAILED", e)
        }
      },

      async digestURL() {
        // digest url, for sharing etc + kind of init
        let routeTo = ''

        const p = getURLParams()
        if ('lskey' in p) {
          data.lskey.value = p.lskey
        }
        if ('start' in p) {
          data.startTime.value = guessTimestamp(p.start)
        }
        const isSharing = countKeysAmong(p, "lat", "lon", "at") == 3 && local.shareNewPoints
        if (isSharing || 'lskey' in p) {
          routeTo = 'follow'
        }
        if (routeTo === '' && local.lastRoute) {
          router.replace({ name: local.lastRoute })
        }
        if (routeTo !== '') {
          router.replace({ name: routeTo })
        }
        /* fully non-async before here, so we can directly view a given tab */
        let content = ''
        if (isSharing) {
          const ts = guessTimestamp(p.at)
          try {
            content = await appendSharedContent(
              data.lskey.value,
              niceTimestamp(ts) + "\n" + window.location.toString().replace(/#.*/, '') + "\n"
            )
          } catch (e) {
            // e.g. cors limitations
            console.log("APPEND SHARED FAILED", e)
          }
        } else if (local.importSharedPoints) {
          try {
            content = await getSharedContent(data.lskey.value)
          } catch (e) {
            console.log("GET SHARED FAILED", e)
          }
        }
        removeURLParams()
        if (content && local.importSharedPoints) {
          await this.loadSharedPoints(content)
        }
      },

    }
    watchEffect(() => {
      const k = o.lskey.value
      if (local.estimateLocations[k] === undefined) {
        local.estimateLocations[k] = []
      }
    })
    watchEffect(() => {
      const k = o.lskey.value
      local.lastLSKey = k
      if (k && !local.usedLSKeys.includes(k)) {
        local.usedLSKeys.push(k)
      }
      if (local.points[k] === undefined) {
        local.points[k] = []
      }
    })
    watchEffect(() => {
      if (o.startTime.value) {
        local.lastStartTime = o.startTime.value
      }
    })
    watchEffect(async () => {
      if (o.lskey.value === '') {
        return
      }
      const gpxPath = o.gpxPath.value as string
      o.gpxContent.value = markRaw(await loadGpx(gpxPath) as GpxParser)
    })
    router.afterEach(ev => {
      if (ev.name?.toString() === 'config') {
        return
      }
      local.lastRoute = ev.name?.toString() ?? ''
    })

    if (local.importSharedPoints) {
      o.loadSharedPoints()
    }

    return o
  },
)

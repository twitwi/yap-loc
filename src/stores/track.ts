import { appendSharedContent, countKeysAmong, getProtectedTextURL, getSharedContent, getURLParams, guessTimestamp, loadGpx, lskeyToDocid, niceTimestamp, parseTimedPoint, safeHTMLText } from "@/utils"
import { defineStore } from "pinia"
import { computed, markRaw, ref, watchEffect } from "vue"
import { useLocalStore } from "./persist"
import type GpxParser from "gpxparser"
import { computeCumulatedDPlus } from "@/utils-analyze"

export type DebugLog = {
  text: string
  class?: string
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
      cumulatedDistance: computed(() => {
        if (data.gpxContent.value === undefined || data.gpxContent.value.tracks[0] === undefined) {
          return [] as number[]
        }
        return data.gpxContent.value.tracks[0].distance.cumul as unknown as number[]
      }),
      cumulatedDPlus: computed(() => {
        if (data.gpxContent.value === undefined) {
          return []
        }
        return computeCumulatedDPlus(data.gpxContent.value?.tracks[0])
      }),

      contributeURL(lat: number, lon: number, ts: number) {
        let res = o.baseURLWithATrack.value
        res += `,${lat.toFixed(4)},${lon.toFixed(4)},${ts}`
        return res
      },

      async contributeDeviceLocation() {
        try {
          const pos = await this.getDeviceLocation()
          const ts = Math.round(pos.timestamp / 1000)
          const url = this.contributeURL(pos.coords.latitude, pos.coords.longitude, ts)
          data.logs.value.push({ class: 'pending', text: url })
          await appendSharedContent(o.lskey.value, niceTimestamp(ts * 1000) + '\n' + url + '\n')
          if (data.logs.value.slice(-1)[0].text === url) {
            data.logs.value.splice(-1, 1)
          }
          data.logs.value.push({ class: 'done', text: url })
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

      async loadSharedPoints() {
        const res = []
        try {
          const sharedContent = await getSharedContent(o.lskey.value)
          const isBaseURLOk = (l: string) => l.startsWith(o.baseURL.value) || l.startsWith('https://twitwi.github.io/cap_nn/')
          const lskey = data.lskey.value
          for (const l of sharedContent.split("\n").filter(isBaseURLOk)) {
            const p = getURLParams(new URL(l))
            if (countKeysAmong(p, "lat", "lon", "at") == 3 && p.lskey === lskey) {
              const ts = guessTimestamp(p.at)
              if (res.map((p) => p.ts).indexOf(ts) === -1) {
                res.push(parseTimedPoint (`${ts}`, p.lat, p.lon))
              }
            }
          }
          local.points[data.lskey.value] = res
        } catch (e) {
          // e.g. cors limitations
          console.log("GET SHARED FAILED", e)
        }
      },
    }
    watchEffect(() => {
      if (o.lskey.value) {
        local.lastLSKey = o.lskey.value
      }
    })
    watchEffect(() => {
      if (o.startTime.value) {
        local.lastStartTime = o.startTime.value
      }
    })
    watchEffect(async () => {
      const gpxPath = o.gpxPath.value as string
      o.gpxContent.value = markRaw(await loadGpx(gpxPath) as GpxParser)
    })

    if (local.importSharedPoints) {
      o.loadSharedPoints()
    }

    return o
  },
)

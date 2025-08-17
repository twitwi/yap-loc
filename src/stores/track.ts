import { appendSharedContent, niceTimestamp, safeHTMLText } from "@/utils"
import { defineStore } from "pinia"
import { computed, ref, watchEffect } from "vue"
import { useLocalStore } from "./persist"

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
      baseURL: ref(window.location.origin + window.location.pathname),
      logs: ref([] as DebugLog[])
    }
    const o = {
      ...data,

      track: computed(() => data.lskey.value.split('@')[0]),
      gpxPath: computed((() => `gpx/${o.track.value}.gpx`) as () => string),
      baseURLWithATrack: computed((() => data.baseURL.value + '?A=' + o.track.value) as () => string),

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
          await appendSharedContent(o.lskey.value, niceTimestamp(ts) + '\n' + url + '\n')
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
    }
    watchEffect(() => {
      if (o.lskey.value) {
        local.lastLSKey = o.lskey.value
      }
    })
    return o
  },
)

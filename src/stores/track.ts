import { appendSharedContent, niceTimestamp, safeHTMLText } from "@/utils"
import { defineStore } from "pinia"
import { computed, ref } from "vue"
import { useLocalStore } from "./persist"

export type DebugLog = {
  text: string
  class?: string
}

export const useTrackStore = defineStore(
  'track',
  () => {
    // like setup() in a component
    const data = {
      lskey: ref(''),
      track: ref(''),
      baseURL: ref(window.location.origin + window.location.pathname),
      logs: ref([] as DebugLog[])
    }
    const o = {
      ...data,

      baseURLWithATrack: computed(() => data.baseURL.value + '?A=' + data.track.value),

      setTrack(t: string) {
        const local = useLocalStore()
        data.track.value = t
        local.lastTrack = t
      },

      contributeURL(lat: number, lon: number, ts: number) {
        let res = o.baseURLWithATrack.value
        res += `,${lat.toFixed(4)},${lon.toFixed(4)},${ts}`
        return res
      },

      async contributeDeviceLocation() {
        try {
          const pos = await this.getDeviceLocation()
          const ts = Math.round(pos.timestamp/1000)
          const url = this.contributeURL(pos.coords.latitude, pos.coords.longitude, ts)
          data.logs.value.push({ class: 'pending', text: url })
          await appendSharedContent(
            data.lskey.value,
            niceTimestamp(ts) + "\n" + url + "\n"
          );
          if (data.logs.value.slice(-1)[0].text === url) {
            data.logs.value.splice(-1, 1);
          }
          data.logs.value.push({ class: 'done', text: url })
        } catch (e) {
          const ee = e as Record<string, string>
          data.logs.value.push({ class: 'error', text: safeHTMLText(ee.message) })
        };
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
    return o
  },
)


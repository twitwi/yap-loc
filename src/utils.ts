
import gpxParser from "gpxparser"
import { CryptoJS } from "./protectedtext/cryptojs"
import { useLocalStore } from "./stores/persist"


export function safeHTMLText(txt: string) {
  return new Option(txt).innerHTML
}

export function niceTimestamp(msec: number) {
  const res = timestampToDatetimeInputString(msec)
  return res.replace(/(T|:\d\d\..*)/g, ' ')
}

export function timestampToDatetimeInputString(timestamp: number) {
  const date = new Date(timestamp + _getTimeZoneOffsetInMs())
  // slice(0, 19) includes seconds
  return date.toISOString().slice(0, 19)
}

function _getTimeZoneOffsetInMs() {
  return new Date().getTimezoneOffset() * -60 * 1000
}

export function elapsedTimeToString(elapsed: number) {
  elapsed /= 1000
  const elapsedH = Math.floor(elapsed / 3600)
  const elapsedM = Math.floor(elapsed / 60) % 60
  const elapsedS = Math.round(elapsed % 60)

  return elapsedH + "h " + elapsedM + "m " + elapsedS + "s";
}



// =============== GPX ============

export async function loadGpx(path: string) {
  const req = await fetch(path)
  if (!req.ok) {
    throw new Error(`Cannot load gpx ${path}: ${req.status}`)
  }
  const gpx = new gpxParser()
  const gpxText = await req.text()
  gpx.parse(gpxText)
  return gpx
}


// =============== URL ===============

export type TimedPoint = {
  ts: number
  lat: number
  lon: number
}

export function parseTimedPoint(ts: string, lat: string, lon: string) {
  return {
    ts: parseInt(ts), // in milliseconds
    lat: parseFloat(lat),
    lon: parseFloat(lon),
  } as TimedPoint
}


export function guessTimestamp(s: string) {
  // It can be an iso date, or an epoch time in ms or s
  if (-1 !== s.indexOf("T")) {
    return Date.parse(s)
  }
  const v = parseInt(s)
  if (v < 30000000000) {
    // before end of 1970, so we probably receive sec and not ms
    return 1000 * v
  } else {
    return v
  }
}


export function getURLParams(url?: URL) {
  const urlSearchParams = new URLSearchParams((url ?? window.location).search)
  const urlObject = Object.fromEntries(urlSearchParams.entries())
  const shortcuts = {
    A: 'lskey lat lon at start',
  } as Record<string, string>

  const res = {} as Record<'lskey' | 'lat' | 'lon' | 'at' | 'start', string>
  // consume possible shortcuts
  for (const s in shortcuts) {
    if (s in urlObject) {
      const keys = shortcuts[s].split(/ /g)
      Object.assign(res, Object.fromEntries(urlObject[s].split(/,/g).map((v,i) => [keys[i], v])))
      delete urlObject[s]
    }
  }
  // save other params
  Object.assign(res, urlObject)
  return res;
}

const reduceSum = [(a: number, b: number) => a + b, 0] as [(a: number, b: number) => number, number]

export function countKeysAmong(o: Record<string, unknown>, ...keys: string[]) {
  return keys.map((k) => k in o ? 1 : 0).reduce(...reduceSum)
}





// =============== protectedtex ============
/* Need
    <script src="https://www.protectedtext.com/js/sha512.js"></script>
    <script src="https://www.protectedtext.com/js/aes.js"></script>
  NB: custom wrapped in protectedtext/cryptojs.ts
  NB: we also use a CORS proxy at heeere.com that has a yes-list of only a few servers (including localhost:7777 and the github of the 3 renards)
  NB: can get rate limited
*/
export let protectedTextPassword = ''
protectedTextPassword = 'SmcqiZ5qQ9Vd8P9'

export function lskeyToDocid(lskey: string) {
  // protectedtext replaces @, so better not use it
  return 'cap_nn___gpx/' + lskey.replace('@', '__') + '.gpx'
}
export function getProtectedTextURL(docid: string, get = true, cors = true as boolean | string, pass = undefined as undefined | true) {
  if (cors === true) {
    cors = useLocalStore().cors
  } else if (cors === false) {
    cors = ''
  }
  return (
    cors +
    ('https://www.protectedtext.com/' +
    docid +
    (get ? '?action=getJSON' : '') +
    (pass === true ? '?' + protectedTextPassword : pass ? '?' + pass : ''))
  )
}
export async function appendSharedContent(lskey: string, v: string, pass = protectedTextPassword) {
  return await getSharedContent(lskey, pass, v)
}
export async function getSharedContent(lskey: string, pass = protectedTextPassword, alsoAppendValue?: string) {
  const docid = lskeyToDocid(lskey)
  const end = CryptoJS.SHA512('/' + docid).toString()
  const url = getProtectedTextURL(docid)
  const req = await fetch(url, {
    credentials: 'omit',
    headers: url.includes('heeere') ? {
      Pragma: 'no-cache',
      'Cache-Control': 'no-cache',
    } : {},
  })
  const o = await req.json()
  const raw = CryptoJS.AES.decrypt(o.eContent, pass).toString(CryptoJS.enc.Utf8)
  let content = raw.substring(0, raw.length - end.length)
  if (!alsoAppendValue) {
    return content
  }
  let initHashContent = content + CryptoJS.SHA512(pass).toString()
  initHashContent = CryptoJS.SHA512(initHashContent).toString() + 2
  content += '\n' + alsoAppendValue
  let currentHashContent = content + CryptoJS.SHA512(pass).toString()
  currentHashContent = CryptoJS.SHA512(currentHashContent).toString() + 2
  const encryptedContent = CryptoJS.AES.encrypt(content + end, pass).toString()
  await fetch(getProtectedTextURL(docid, false), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      initHashContent,
      currentHashContent,
      encryptedContent,
      action: 'save',
    }),
  })
  return content
}

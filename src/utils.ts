import { CryptoJS } from "./protectedtext/cryptojs"

export function safeHTMLText(txt: string) {
  return new Option(txt).innerHTML
}

export function niceTimestamp(sec: number) {
  const res = timestampToDatetimeInputString(sec * 1000)
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
export function getProtectedTextURL(docid: string, get = true, cors = true, pass = undefined as undefined | true) {
  return (
    (cors ? 'https://cors.heeere.com/' : '') +
    'https://www.protectedtext.com/' +
    docid +
    (get ? '?action=getJSON' : '') +
    (pass === true ? '?' + protectedTextPassword : pass ? '?' + pass : '')
  )
}
export async function appendSharedContent(lskey: string, v: string, pass = protectedTextPassword) {
  return await getSharedContent(lskey, pass, v)
}
export async function getSharedContent(lskey: string, pass = protectedTextPassword, alsoAppendValue?: string) {
  const docid = lskeyToDocid(lskey)
  const end = CryptoJS.SHA512('/' + docid).toString()
  const req = await fetch(getProtectedTextURL(docid), {
    headers: {
      Pragma: 'no-cache',
      'Cache-Control': 'no-cache',
    },
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
}

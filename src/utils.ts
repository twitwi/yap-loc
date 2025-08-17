import { CryptoJS } from "./protectedtext/cryptojs"

export function safeHTMLText(txt: string) {
  return new Option(txt).innerHTML
}

// =============== protectedtex ============
/* Need
    <script src="https://www.protectedtext.com/js/sha512.js"></script>
    <script src="https://www.protectedtext.com/js/aes.js"></script>
  NB: we also use a CORS proxy at heeere.com that has a yes-list of only a few servers (including localhost:7777 and the github of the 3 renards) -->
*/
export let protectedTextPassword = ''
protectedTextPassword = 'SmcqiZ5qQ9Vd8P9'

function lskeyToDocid(lskey: string) {
  return 'cap_nn___' + lskey
}
function getProtectedTextURL(docid: string, get = true, cors = true, pass = undefined) {
  return (
    (cors ? 'https://cors.heeere.com/' : '') +
    'https://www.protectedtext.com/' +
    docid +
    (get ? '?action=getJSON' : '') +
    (pass === true ? '?' + protectedTextPassword : pass ? '?' + pass : '')
  )
}
export async function appendSharedContent(lskey: string, v: string, pass: string) {
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

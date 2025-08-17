<script setup lang="ts">
import { useLocalStore } from '@/stores/persist'
import { useTrackStore } from '@/stores/track'
import { NButton, NDatePicker, NSpace, NSwitch } from 'naive-ui'
import { computed, reactive, ref } from 'vue'

const track = useTrackStore()
const local = useLocalStore()

function promptChangeLSKey() {
  const t = prompt('Enter lskey', local.lastLSKey)
  if (t !== null) {
    track.lskey = t
  }
}

const sms = reactive({
  withStart: true,
  withHour: true,
  withGenericLink: true,
})

const smsURL = computed(() => {
  const start = (track.startTime / 1000).toFixed(0)
  let res = track.baseURLWithATrack
  res += ',%1$.4f,%2$.4f,%3$ts'
  if (sms.withStart && start) {
    res += `,${start}`
  }
  if (sms.withHour) {
    res += '\n(%3$tT)'
  }
  if (sms.withGenericLink) {
    res += '\nhttp://maps.google.com/?ll=%1$.4f,%2$.4f'
  }
  return res

})

const smsElement = ref(undefined as HTMLElement | undefined)

async function copySMSURL() {
  if (!smsElement.value) {
    return
  }
  await navigator.clipboard.writeText(smsURL.value)
  smsElement.value.classList.add('copied')
  setTimeout(() => smsElement.value!.classList.remove('copied'), 500)
}

</script>

<template>
  <div class="main-contrib">
    <div style="display: flex; flex-direction: column;">
      <code style="font-size: 25px; text-align: center;"
        @click="promptChangeLSKey()">{{ track.track || '(( not set ))' }}</code>
      <NButton type="success" secondary @click="track.contributeDeviceLocation()">Contribute location <span
          v-if="track.lskey"> ({{ track.lskey }})</span></NButton>
    </div>
    <ul class="debug-logs">
      <li v-for="l, il in track.logs.slice().reverse()" :key="il" :class="l.class">{{ l.text }}</li>
    </ul>
    <hr style="margin-top: 10em" />
    <details open>
      <summary>Links</summary>
      <ul>
        <li>
          Download GPX file: <a :href="track.gpxPath"> {{ track.gpxPath }}</a>
        </li>
        <li>
          View/Edit shared points: <a :href="track.sharedURLlink" target="_blank">{{ track.sharedURLlink }}</a>
        </li>
      </ul>
    </details>
    <hr />
    <details open>
      <summary>SMS Config (android app)</summary>
      <NSpace>
        <NSwitch v-model:value="sms.withStart" :round="false" title="include start" style="margin-top:1em"></NSwitch>
        <NDatePicker v-if="sms.withStart" v-model:value="track.startTime" type="datetime" clearable />
      </NSpace>
      <NSpace>
        <NSwitch v-model:value="sms.withHour" :round="false" title="show time"></NSwitch>
        <NSwitch v-model:value="sms.withGenericLink" :round="false" title="add generic link"></NSwitch>
      </NSpace>
      <br/>
      <br />
      <pre ref="smsElement"><code>{{ smsURL }}</code></pre>
      <button @click="copySMSURL()">Copier dans le presse papier</button>
    </details>
    <hr />
  </div>
</template>

<style>
.debug-logs {
  li {
    list-style: none;
    padding: 0.2em 1em;
    border-left: 2em solid black;
  }

  li:first-of-type {
    margin: 1em 0;
  }

  li.error {
    border-color: red;
  }

  li.pending {
    border-color: yellow;
  }

  li.done {
    border-color: green;
  }
}

a>span {
  text-decoration: none;
  color: black;
}

pre.copied {
  background: var(--copied);
}
</style>

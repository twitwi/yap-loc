<script setup lang="ts">
import { RouterView } from 'vue-router'
import ReloadPrompt from './components/ReloadPrompt.vue'
import { NButton, NButtonGroup, NConfigProvider, NIcon } from 'naive-ui'
import { bindRouterLink, getTheme } from './main-naiveui'
import { AddLocationAltTwotone, DownloadTwotone, MyLocationRound, RouteTwotone, SettingsSuggestTwotone } from '@vicons/material'
import { useLocalStore } from './stores/persist'
import { useTrackStore } from './stores/track'
import { onMounted } from 'vue'
import { appendSharedContent, countKeysAmong, getURLParams, guessTimestamp, niceTimestamp } from './utils'
import router from './router'

const color = import.meta.env.VITE_THEME_HEXCOLOR
const theme = getTheme(color)

const local = useLocalStore()
const track = useTrackStore()

onMounted(async () => {
  // TODO: could move and refactor with other use of getShared....
  // digest url, for sharing etc

  const p = getURLParams()
  if ('lskey' in p) {
    track.lskey = p.lskey
  }
  if ('start' in p) {
    track.startTime = guessTimestamp(p.start)
  }
  if ('contrib' in p) {
    router.replace('contrib')
    return
  }
  if (countKeysAmong(p, "lat", "lon", "at") == 3 && local.shareNewPoints) {
     const ts = guessTimestamp(p.at)
    try {
      await appendSharedContent(
        track.lskey,
        niceTimestamp(ts) + "\n" + window.location.toString().replace(/#.*/, '') + "\n"
      )
    } catch (e) {
      // e.g. cors limitations
      console.log("APPEND SHARED FAILED", e)
    }
  }
})

</script>

<template>
  <NConfigProvider :theme-overrides="theme">
    <div id="root">
      <header>
        <nav>
          <NButtonGroup class="header">
            <NButton v-bind="bindRouterLink('show-my-loc')" style="flex: 1"><NIcon><MyLocationRound /></NIcon></NButton>
            <NButton v-if="track.track" v-bind="bindRouterLink('follow')"><NIcon><RouteTwotone /></NIcon></NButton>
            <NButton v-if="local.enableContrib" v-bind="bindRouterLink('contrib')"><NIcon><AddLocationAltTwotone /></NIcon></NButton>
            <NButton v-bind="bindRouterLink('config')" style="flex: 0"><NIcon><SettingsSuggestTwotone /></NIcon> </NButton>
            <NButton v-if="local.enableBackup" v-bind="bindRouterLink('backup')" style="flex: 0"><NIcon><DownloadTwotone /></NIcon> </NButton>
          </NButtonGroup>
        </nav>
      </header>

      <div class="router-view">
        <RouterView />
      </div>
    </div>
  </NConfigProvider>
  <ReloadPrompt />
</template>

<style>
:root {
  --copied: #BFB;
}
#root {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  > .header {
    flex: 0;
  }
  > .router-view {
    flex: 1;
    overflow-y: scroll;
    position: relative;
  }
}
.header {
  width: 100%;
  display: flex;
  & > * {
    flex: 100;
  }
}
</style>

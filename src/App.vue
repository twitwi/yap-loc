<script setup lang="ts">
import { RouterView } from 'vue-router'
import ReloadPrompt from './components/ReloadPrompt.vue'
import { NButton, NButtonGroup, NConfigProvider, NIcon } from 'naive-ui'
import { bindRouterLink, getTheme } from './main-naiveui'
import { AddLocationAltTwotone, DownloadTwotone, FullscreenExitSharp, FullscreenSharp, MyLocationRound, RouteTwotone, SettingsSuggestTwotone } from '@vicons/material'
import { useLocalStore } from './stores/persist'
import { useTrackStore } from './stores/track'
import { onMounted, useTemplateRef } from 'vue'
import { useFullscreen, useWindowSize } from '@vueuse/core'

const color = import.meta.env.VITE_THEME_HEXCOLOR
const theme = getTheme(color)

const local = useLocalStore()
const track = useTrackStore()

const root = useTemplateRef('root')
const { isFullscreen, toggle: toggleFS } = useFullscreen(root)

const { height: windowHeight } = useWindowSize()

onMounted(/*partially async*/ () => track.digestURL())

</script>

<template>
  <NConfigProvider :theme-overrides="theme">
    <div id="root" ref="root">
      <component :is="'style'">:root { --vh: {{ windowHeight }}px; }</component>
      <header>
        <nav>
          <NButtonGroup class="header">
            <NButton v-bind="bindRouterLink('show-my-loc')" style="flex: 1"><NIcon><MyLocationRound /></NIcon></NButton>
            <NButton v-if="track.track || local.enableView" v-bind="bindRouterLink('follow')"><NIcon><RouteTwotone /></NIcon></NButton>
            <NButton v-if="local.enableContrib" v-bind="bindRouterLink('contrib')"><NIcon><AddLocationAltTwotone /></NIcon></NButton>
            <NButton v-bind="bindRouterLink('config')" style="flex: 0"><NIcon><SettingsSuggestTwotone /></NIcon> </NButton>
            <NButton v-if="local.enableBackup" v-bind="bindRouterLink('backup')" style="flex: 0"><NIcon><DownloadTwotone /></NIcon> </NButton>
            <NButton v-if="local.enableFullscreen" style="flex: 0" @click="toggleFS()"><NIcon><FullscreenExitSharp v-if="isFullscreen" /><FullscreenSharp v-else /></NIcon> </NButton>
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
html, body, #root {
  padding: 0;
  margin: 0;
  border: none;
  height: var(--vh);
}
#root {
  background: white; /* for FS */
  display: flex;
  flex-direction: column;
  width: 100vw;
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

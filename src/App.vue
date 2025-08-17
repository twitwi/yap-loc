<script setup lang="ts">
import { RouterView } from 'vue-router'
import ReloadPrompt from './components/ReloadPrompt.vue'
import { NButton, NButtonGroup, NConfigProvider, NIcon } from 'naive-ui'
import { bindRouterLink, getTheme } from './main-naiveui'
import { AddLocationAltTwotone, DownloadTwotone, MyLocationRound, SettingsSuggestTwotone } from '@vicons/material'
import { useLocalStore } from './stores/persist'

const color = import.meta.env.VITE_THEME_HEXCOLOR
const theme = getTheme(color)

const local = useLocalStore()

</script>

<template>
  <NConfigProvider :theme-overrides="theme">
    <div id="root">
      <header>
        <nav>
          <NButtonGroup class="header">
            <NButton v-bind="bindRouterLink('show-my-loc')" style="flex: 1"><NIcon><MyLocationRound /></NIcon></NButton>
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

<script setup lang="ts">
import { useLocalStore } from '@/stores/persist';
import { useTrackStore } from '@/stores/track';
import { getSharedContent } from '@/utils';
import { CloseSharp, DownloadForOfflineOutlined } from '@vicons/material';
import { NButton, NIcon } from 'naive-ui';
import { ref } from 'vue';

const local = useLocalStore()
const track = useTrackStore()

const status = ref('waiting')
const allContent = ref([] as string[])
const delay = 400

async function start() {
  if (status.value !== 'waiting') {
    return
  }
  status.value = 'getting content'
  allContent.value.splice(0, allContent.value.length)
  for (const g of local.usedLSKeys) {
    try {
      allContent.value.push(await getSharedContent(g) ?? '((undefined))')
    } catch {
      allContent.value.push('((no reply))')
    }
    await new Promise(resolve => setTimeout(resolve, delay))
  }
  status.value = 'done'
}

function forgetUsedLSKey(lskey: string) {
  const ind = local.usedLSKeys.findIndex(k => k === lskey)
  local.usedLSKeys.splice(ind, 1)
  status.value = 'waiting'
  allContent.value.splice(0, allContent.value.length)
}

function download(i: number) {
  const g = local.usedLSKeys[i]
  const content = allContent.value[i]
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([content]))
  a.download = `save-protected-text-${g}.txt`
  a.click()
}

function downloadAll() {
  const content = Object.fromEntries(local.usedLSKeys.map((g, i) => [g, allContent.value[i]]))
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([JSON.stringify(content)]))
  a.download = `save-protected-text---all.txt`
  a.click()
}


</script>

<template>
  <div class="main-backup">
    <NButton @click="start()" >Start</NButton><code>{{ status }}</code>
    <template v-for="g,ig in local.usedLSKeys" :key="g">
      <h4>
        <span :class="{ currentLSKey: g === track.lskey }">
          <NIcon @click="forgetUsedLSKey(g)"><CloseSharp /></NIcon>
        </span>
        {{ g }}
        <NIcon v-if="allContent[ig]" @click="download(ig)" :title="allContent[ig]" :class="{ pb: allContent[ig].startsWith('((')}"><DownloadForOfflineOutlined /></NIcon>
      </h4>
    </template>
    <h1>All-in-one <NIcon v-if="allContent.length === local.usedLSKeys.length" @click="downloadAll()"><DownloadForOfflineOutlined /></NIcon></h1>
  </div>
</template>

<style>
.pb {
  border: 1px solid red;
  color: brown;
}
.currentLSKey {
  visibility: hidden;
}
</style>

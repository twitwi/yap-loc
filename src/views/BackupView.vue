<script setup lang="ts">
import { getSharedContent } from '@/utils';
import { DownloadForOfflineOutlined } from '@vicons/material';
import { NButton, NIcon } from 'naive-ui';
import { ref } from 'vue';



const all = ref([
//'22annecy42',
//'22breizh42',
//'22cenis',
//'22eb149',
//'22lst75',
//'22mcr',
//'22tdc70',
//'22utmj',
//'22utp',
//'23cenis',
//'23eb',
//'23gr34',
//'23lst',
//'23ttt',
//'24cenis',
//'24eb',
//'24gtl',
//'24lpf',
//'24ouste',
//'24ttt',
//'24u01',
//'25cenis',
//'25ertc',
'25ttt',
'migoual-concept-race',
'tmt22-26km',
])

const status = ref('waiting')
const allContent = ref([] as string[])
const delay = 400

async function start() {
  if (status.value !== 'waiting') {
    return
  }
  status.value = 'getting content'
  for (const g of all.value) {
    try {
      allContent.value.push(await getSharedContent(`gpx/${g}.gpx`) ?? '((undefined))')
    } catch {
      allContent.value.push('((no reply))')
    }
    await new Promise(resolve => setTimeout(resolve, delay))
  }
  status.value = 'done'
}

function download(i: number) {
  const g = all.value[i]
  const content = allContent.value[i]
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([content]))
  a.download = `save-protected-text-${g}.txt`
  a.click()
}

function downloadAll() {
  const content = Object.fromEntries(all.value.map((g, i) => [g, allContent.value[i]]))
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([JSON.stringify(content)]))
  a.download = `save-protected-text---all.txt`
  a.click()
}


</script>

<template>
  <div class="main-backup">
    <NButton @click="start()" >Start</NButton><code>{{ status }}</code>
    <template v-for="g,ig in all" :key="g">
      <h4>{{ g }} <NIcon v-if="allContent[ig]" @click="download(ig)" :title="allContent[ig]" :class="{ pb: allContent[ig].startsWith('((')}"><DownloadForOfflineOutlined /></NIcon></h4>
    </template>
    <h1>All-in-one <NIcon v-if="allContent.length === all.length" @click="downloadAll()"><DownloadForOfflineOutlined /></NIcon></h1>
  </div>
</template>

<style>
.pb {
  border: 1px solid red;
  color: brown;
}
</style>

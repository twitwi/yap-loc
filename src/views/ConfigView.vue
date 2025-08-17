<script setup lang="ts">
import { useLocalStore } from '@/stores/persist'
import { NCard, NSpace, NSwitch } from 'naive-ui'

const local = useLocalStore()

</script>

<template>
  <div class="main-config">
    <NCard>
      <NSpace>
        Enable View
        <NSwitch v-model:value="local.enableView" :round="false"></NSwitch>
      </NSpace>
      <NSpace>
        Enable Contrib
        <NSwitch v-model:value="local.enableContrib" :round="false"></NSwitch>
      </NSpace>
    </NCard>
  </div>
</template>

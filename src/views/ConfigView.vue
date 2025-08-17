<script setup lang="ts">
import { useLocalStore } from '@/stores/persist'
import { useTrackStore } from '@/stores/track'
import { NCard, NForm, NFormItem, NInput, NSpace, NSwitch } from 'naive-ui'

const local = useLocalStore()
const track = useTrackStore()

</script>

<template>
  <div class="main-config">
    <NCard>
      <NForm inline :model="local">
        <NFormItem label="Last LSKey">
          <NInput v-model:value="local.lastLSKey"></NInput>
        </NFormItem>
        <NFormItem label="Current LSKey">
          <NInput v-model:value="track.lskey"></NInput>
        </NFormItem>
        <NFormItem label="Current Track">
          <p>{{ track.track }}</p>
        </NFormItem>
      </NForm>
      <NSpace>
        Enable View
        <NSwitch v-model:value="local.enableView" :round="false"></NSwitch>
      </NSpace>
      <NSpace>
        Enable Contrib
        <NSwitch v-model:value="local.enableContrib" :round="false"></NSwitch>
      </NSpace>
      <NSpace>
        Enable Backup
        <NSwitch v-model:value="local.enableBackup" :round="false"></NSwitch>
      </NSpace>
    </NCard>
  </div>
</template>

<script setup lang="ts">
import { useLocalStore } from '@/stores/persist'
import { useTrackStore } from '@/stores/track'
import { NButton, NCard, NForm, NFormItem, NInput, NSpace, NSwitch } from 'naive-ui'

const local = useLocalStore()
const track = useTrackStore()

function promptClearLocalPoints() {
  const l = local.points.length
  if (confirm('Really remove the ' + l + ' local points?')) {
    local.points.splice(0, l)
  }
}
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
    <NCard>
      <NSpace>
        Use shared points
        <NSwitch v-model:value="local.importSharedPoints" :round="false"></NSwitch>
      </NSpace>
      <NSpace>
        Share new points
        <NSwitch v-model:value="local.shareNewPoints" :round="false"></NSwitch>
      </NSpace>
      <NButton :type="local.points.length == 0 ? 'default' : 'warning'" @click="promptClearLocalPoints()">Clear ({{ local.points.length }}) local points</NButton>
    </NCard>
  </div>
</template>

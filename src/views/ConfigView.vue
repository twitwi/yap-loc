<script setup lang="ts">
import { useLocalStore } from '@/stores/persist'
import { useTrackStore } from '@/stores/track'
import { NButton, NCard, NForm, NFormItem, NInput, NSpace, NSwitch } from 'naive-ui'
import { computed } from 'vue'

const local = useLocalStore()
const track = useTrackStore()

const nPoints = computed(() => {
  return local.points[track.lskey]?.length ?? 0
})

function promptClearLocalPoints() {
  const l = local.points[track.lskey]?.length
  if (l === undefined) return
  if (confirm('Really remove the ' + l + ' local points?')) {
    local.points[track.lskey].splice(0, l)
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
        <NFormItem label="Last tab">
          <NInput v-model:value="local.lastRoute"></NInput>
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
      <NButton :type="nPoints == 0 ? 'default' : 'warning'" @click="promptClearLocalPoints()">Clear ({{ nPoints }}) local points</NButton>
    </NCard>
  </div>
</template>

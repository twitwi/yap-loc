<script setup lang="ts">
import { CORS, TILE_FORMAT, useLocalStore } from '@/stores/persist'
import { useTrackStore } from '@/stores/track'
import { NButton, NCard, NForm, NFormItem, NInput, NInputNumber, NSpace, NSwitch } from 'naive-ui'
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
      <NSpace :align="'baseline'">
        Tile server <span :title="'default is ' + TILE_FORMAT + ' (click to reset)'" @click="local.tileFormat = TILE_FORMAT">(+default)</span>
        <NInput v-model:value="local.tileFormat" :autosize="true" ></NInput>
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
        Use start time in shared points
        <NSwitch v-model:value="local.importSharedStart" :round="false"></NSwitch>
      </NSpace>
      <NSpace>
        Share new points
        <NSwitch v-model:value="local.shareNewPoints" :round="false"></NSwitch>
      </NSpace>
      <NSpace :align="'baseline'">
        CORS server for protectedtext <span :title="'default is ' + CORS + ' (click to reset)'" @click="local.cors = CORS">(+default)</span>
         <span :title="'NOT RECOMMENDED (slow) alternative only for reading, NOT RECOMMENDED (click to set)'" @click="local.cors = 'https://api.allorigins.win/raw?url='">(+alt)</span>
        <NInput v-model:value="local.cors" :autosize="true" ></NInput>
      </NSpace>
      <NButton :type="nPoints == 0 ? 'default' : 'warning'" @click="promptClearLocalPoints()">Clear ({{ nPoints }}) local points</NButton>
    </NCard>
    <NCard>
      <NSpace>
        Minimum plausible (average) speed
        <NInputNumber v-model:value="local.minSpeed" :format="v => `${v} km/h`" :parse="v => parseFloat(v.split(' ')[0])"></NInputNumber>
      </NSpace>
      <NSpace>
        Maximum plausible (average) speed
        <NInputNumber v-model:value="local.maxSpeed" :format="v => `${v} km/h`" :parse="v => parseFloat(v.split(' ')[0])"></NInputNumber>
      </NSpace>
      <NSpace>
        Number of D+ to equal 1km
        <NInputNumber v-model:value="local.dPlusPerKm" :format="v => `${v} mD+/km`" :parse="v => parseFloat(v.split(' ')[0])" :step="10"></NInputNumber>
      </NSpace>
    </NCard>
  </div>
</template>

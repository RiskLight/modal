<template>
  <div class="demo-card">
    <h3>Level {{ level }}</h3>
    <input :aria-label="`Field ${level}`" placeholder="Type here" />
    <button @click="modal.push(Stacked, { level: level + 1 })">Push deeper</button>
    <button @click="handle.close()">Close</button>
  </div>
</template>

<script setup lang="ts">
import { useCurrentModal, useModal } from '@risklight/modal/vue'
import Stacked from './Stacked.vue'

defineProps<{ level: number }>()
const modal = useModal()
const handle = useCurrentModal()
</script>

<template>
  <div class="demo-card">
    <header class="demo-grip">{{ title }}</header>
    <p>Close with the button below.</p>
    <button @click="handle.close()">Close</button>
  </div>
</template>

<script setup lang="ts">
import { useCurrentModal } from '@risklight/modal/vue'

defineProps<{ title: string }>()
const handle = useCurrentModal()
</script>

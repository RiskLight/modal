<template>
  <div class="demo-card demo-toast">
    {{ text }}
    <button aria-label="Close notification" @click="handle.close()">×</button>
  </div>
</template>

<script setup lang="ts">
import { useCurrentModal } from '@risklight/modal/vue'

defineProps<{ text: string }>()
const handle = useCurrentModal()
</script>

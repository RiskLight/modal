<template>
  <div class="demo-card">
    <h3>{{ question }}</h3>
    <button @click="resolve(true)">Yes</button>
    <button @click="resolve(false)">No</button>
  </div>
</template>

<script setup lang="ts">
import { useModalResolve } from '@risklight/modal/vue'

defineProps<{ question: string }>()
const resolve = useModalResolve<boolean>()
</script>

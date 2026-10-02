<template>
  <div class="demo-card">
    <h3>Unsaved changes</h3>
    <label><input v-model="dirty" type="checkbox" /> dirty</label>
    <p>While dirty, Escape, the backdrop and Close are vetoed.</p>
    <button @click="handle.close()">Close</button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onBeforeModalClose, useCurrentModal } from '@risklight/modal/vue'

const dirty = ref(true)
const handle = useCurrentModal()
onBeforeModalClose(() => !dirty.value)
</script>

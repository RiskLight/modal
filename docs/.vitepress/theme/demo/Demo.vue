<template>
  <div class="demo-buttons">
    <button @click="ask">Prompt</button>
    <button @click="modal.push(Stacked, { level: 1 })">Stack</button>
    <button @click="modal.push(Guarded)">Guarded</button>
    <button @click="modal.push(Panel, { title: 'Drag me by the header' }, { draggable: '.demo-grip' })">Draggable</button>
    <button @click="modal.push(Panel, { title: 'Escape does nothing here' }, { escClose: false })">Blocking</button>
    <button @click="modal.push(Toast, { text: `Saved at ${new Date().toLocaleTimeString()}` }, { namespace: 'toast' })">Toast</button>
  </div>
  <p>Answer: <code>{{ answer }}</code></p>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useModal } from '@risklight/modal/vue'
import Confirm from './Confirm.vue'
import Stacked from './Stacked.vue'
import Guarded from './Guarded.vue'
import Panel from './Panel.vue'
import Toast from './Toast.vue'

const modal = useModal()
const answer = ref('none')

async function ask() {
  answer.value = String(await modal.prompt<boolean>(Confirm, { question: 'Delete the report?' }))
}
</script>

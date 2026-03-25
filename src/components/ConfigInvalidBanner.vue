<script setup lang="ts">
const emit = defineEmits<{
  'open-settings': []
}>()
</script>

<template>
  <div
    class="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-orange-200/50 bg-gradient-to-r from-orange-50/95 via-amber-50/80 to-orange-50/95 px-4 py-2.5 text-[12px] leading-snug text-orange-950"
  >
    <span>请先填写有效的 Base URL，并添加至少一个 model。</span>
    <button
      type="button"
      class="shrink-0 rounded-lg bg-orange-200/90 px-3 py-1 font-medium text-orange-950 hover:bg-orange-300/90"
      @click="emit('open-settings')"
    >
      打开配置
    </button>
  </div>
</template>

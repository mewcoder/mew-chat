<script setup lang="ts">
const emit = defineEmits<{
  'open-settings': []
}>()
</script>

<template>
  <header
    class="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-stone-200/70 bg-[#faf8f5]/80 px-4 shadow-ui-hairline backdrop-blur-md"
  >
    <div class="flex min-w-0 items-center gap-2.5">
      <img
        src="/favicon.svg"
        alt=""
        width="36"
        height="36"
        class="size-9 shrink-0 shadow-ui-md ring-1 ring-white/20"
        aria-hidden="true"
        decoding="async"
      />
      <div class="min-w-0">
        <h1
          class="select-none truncate text-[15px] font-semibold tracking-tight text-stone-900"
        >
          MewChat
        </h1>
        <p class="hidden text-[11px] text-stone-500 sm:block">本地对话界面</p>
      </div>
    </div>
    <button
      type="button"
      class="rounded-lg border border-stone-200/80 bg-white/60 px-3.5 py-2 text-[13px] font-medium text-stone-600 shadow-ui-sm transition hover:border-orange-200/80 hover:bg-orange-50/90 hover:text-stone-900"
      @click="emit('open-settings')"
    >
      模型配置
    </button>
  </header>
</template>

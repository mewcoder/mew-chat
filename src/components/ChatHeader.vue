<script setup lang="ts">
const emit = defineEmits<{
  'open-settings': []
}>()
</script>

<template>
  <header
    class="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-stone-200/70 bg-[#faf8f5]/80 px-4 shadow-ui-hairline backdrop-blur-md dark:border-stone-700/70 dark:bg-[#1c1917]/80"
  >
    <div class="flex min-w-0 items-center gap-2.5">
      <span
        class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-ui-md ring-1 ring-white/20 dark:ring-white/10"
        aria-hidden="true"
      >
        <svg class="size-[22px]" viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <g fill="#fff7ed">
            <ellipse cx="9.6" cy="11.4" rx="2.25" ry="2.85" transform="rotate(-24 9.6 11.4)" />
            <ellipse cx="13.9" cy="8.7" rx="2.05" ry="2.65" transform="rotate(-10 13.9 8.7)" />
            <ellipse cx="18.1" cy="8.7" rx="2.05" ry="2.65" transform="rotate(10 18.1 8.7)" />
            <ellipse cx="22.4" cy="11.4" rx="2.25" ry="2.85" transform="rotate(24 22.4 11.4)" />
            <ellipse cx="16" cy="20.8" rx="7.1" ry="5.9" />
          </g>
          <g fill="#fecdd3" opacity="0.9">
            <ellipse cx="9.6" cy="11.4" rx="0.9" ry="1.1" transform="rotate(-24 9.6 11.4)" />
            <ellipse cx="13.9" cy="8.7" rx="0.85" ry="1" transform="rotate(-10 13.9 8.7)" />
            <ellipse cx="18.1" cy="8.7" rx="0.85" ry="1" transform="rotate(10 18.1 8.7)" />
            <ellipse cx="22.4" cy="11.4" rx="0.9" ry="1.1" transform="rotate(24 22.4 11.4)" />
            <ellipse cx="16" cy="21.5" rx="2.2" ry="1.8" />
          </g>
        </svg>
      </span>
      <div class="min-w-0">
        <h1
          class="select-none truncate text-[15px] font-semibold tracking-tight text-stone-900 dark:text-stone-100"
        >
          MewChat
        </h1>
        <p class="hidden text-[11px] text-stone-500 sm:block dark:text-stone-400">本地对话界面</p>
      </div>
    </div>
    <button
      type="button"
      class="rounded-lg border border-stone-200/80 bg-white/60 px-3.5 py-2 text-[13px] font-medium text-stone-600 shadow-ui-sm transition hover:border-orange-200/80 hover:bg-orange-50/90 hover:text-stone-900 dark:border-stone-600/80 dark:bg-stone-800/60 dark:text-stone-300 dark:hover:border-orange-900/50 dark:hover:bg-stone-800 dark:hover:text-stone-100"
      @click="emit('open-settings')"
    >
      模型配置
    </button>
  </header>
</template>

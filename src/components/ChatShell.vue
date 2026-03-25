<template>
  <div
    class="relative flex h-dvh flex-col overflow-hidden bg-[#faf8f5] text-stone-800"
  >
    <div
      class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_100%_55%_at_50%_-8%,rgba(251,146,60,0.11),transparent_55%)]"
      aria-hidden="true"
    />
    <div
      class="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(120,113,108,0.04)_100%)]"
      aria-hidden="true"
    />
    <div class="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col">
      <slot />
    </div>
  </div>
</template>

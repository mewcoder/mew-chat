<script setup lang="ts">
import { ref, watch, nextTick } from "vue";
import { storeToRefs } from "pinia";
import { useChatSettingsStore } from "./stores/chatSettings";
import { useChat } from "./composables/useChat";
import ApiSettings from "./components/ApiSettings.vue";
import ChatShell from "./components/ChatShell.vue";
import ChatHeader from "./components/ChatHeader.vue";
import ConfigInvalidBanner from "./components/ConfigInvalidBanner.vue";
import ChatMessageList from "./components/ChatMessageList.vue";
import ChatInput from "./components/ChatInput.vue";

const settingsStore = useChatSettingsStore();
const { settingsOpen, configInvalid, normalizedBaseUrl, model } =
  storeToRefs(settingsStore);

const { messages, streaming, sendMessage, stop, clearChat } = useChat();

async function onSend(text: string): Promise<void> {
  if (!normalizedBaseUrl.value) {
    window.alert("请填写 Base URL");
    return;
  }
  if (!model.value.trim()) {
    window.alert("请填写 Model");
    return;
  }
  await sendMessage(text);
}
const scrollRoot = ref<HTMLElement | null>(null);

function scrollToBottom(): void {
  const el = scrollRoot.value;
  if (!el) return;
  el.scrollTop = el.scrollHeight;
}

watch(
  messages,
  () => {
    void nextTick(() => scrollToBottom());
  },
  { deep: true },
);

function openSettings(): void {
  settingsOpen.value = true;
}
</script>

<template>
  <ChatShell>
    <ApiSettings />
    <ChatHeader @open-settings="openSettings" />
    <ConfigInvalidBanner v-if="configInvalid" @open-settings="openSettings" />
    <div
      ref="scrollRoot"
      class="min-h-0 flex-1 overflow-y-auto scroll-smooth overscroll-y-contain"
    >
      <ChatMessageList :messages="messages" :streaming="streaming" />
    </div>
    <ChatInput
      :disabled="configInvalid"
      :streaming="streaming"
      @send="onSend"
      @stop="stop"
      @clear="clearChat"
    />
  </ChatShell>
</template>

<template>
  <TooltipProvider :delay-duration="delayDuration">
    <TooltipRoot>
      <TooltipTrigger as-child>
        <slot />
      </TooltipTrigger>
      <Teleport to="body">
        <TooltipContent
          :side="side"
          :side-offset="sideOffset"
          :align="align"
          :class="[
            'z-50 max-w-xs rounded-lg px-3 py-1.5 text-xs font-medium shadow-md',
            'bg-foreground text-background',
            'data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
            'data-[side=top]:slide-in-from-bottom-2 data-[side=bottom]:slide-in-from-top-2',
            'data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2',
          ]"
        >
          <slot name="content">{{ text }}</slot>
          <TooltipArrow class="fill-foreground" :width="8" :height="4" />
        </TooltipContent>
      </Teleport>
    </TooltipRoot>
  </TooltipProvider>
</template>

<script setup>
import { TooltipProvider, TooltipRoot, TooltipTrigger, TooltipContent, TooltipArrow } from "reka-ui";

defineProps({
  text: {
    type: String,
    default: "",
  },
  side: {
    type: String,
    default: "top",
    validator: (v) => ["top", "bottom", "left", "right"].includes(v),
  },
  align: {
    type: String,
    default: "center",
    validator: (v) => ["start", "center", "end"].includes(v),
  },
  sideOffset: {
    type: Number,
    default: 6,
  },
  delayDuration: {
    type: Number,
    default: 300,
  },
});
</script>

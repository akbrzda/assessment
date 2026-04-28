<template>
  <div class="flex flex-col gap-1.5">
    <label v-if="label" class="text-sm font-medium text-foreground leading-none">
      {{ label }}
      <span v-if="required" class="text-destructive ml-0.5">*</span>
    </label>

    <PopoverRoot v-model:open="isOpen">
      <PopoverTrigger as-child>
        <div
          role="button"
          tabindex="0"
          :class="
            cn(
              'flex h-9 w-full items-center gap-2 rounded-xl border border-input bg-background px-3 text-sm shadow-sm transition cursor-pointer',
              'hover:border-ring focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 focus:border-transparent',
              disabled && 'cursor-not-allowed opacity-50',
              !modelValue && 'text-muted-foreground',
              error && 'border-destructive focus:ring-destructive/30',
            )
          "
          :aria-disabled="disabled"
          @keydown.enter.prevent="!disabled && (isOpen = !isOpen)"
          @keydown.space.prevent="!disabled && (isOpen = !isOpen)"
        >
          <CalendarIcon :size="15" class="shrink-0 text-muted-foreground" />
          <span class="flex-1 text-left truncate">
            {{ displayValue || placeholder || "Выберите дату..." }}
          </span>
          <button v-if="modelValue && clearable" type="button" class="shrink-0 text-muted-foreground hover:text-foreground" @click.stop="clear">
            <XIcon :size="14" />
          </button>
        </div>
      </PopoverTrigger>

      <PopoverPortal>
        <PopoverContent
          :class="
            cn(
              'z-50 w-auto rounded-xl border border-border bg-card p-3 shadow-md',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
              'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
              'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2',
            )
          "
          :side-offset="6"
          align="start"
        >
          <CalendarRoot
            v-model="calendarValue"
            v-slot="{ months, weekDays }"
            :locale="'ru-RU'"
            :fixed-weeks="false"
            @update:model-value="onCalendarSelect"
          >
            <div class="space-y-3">
              <div v-for="month in months" :key="month.value.toString()">
                <div class="flex items-center justify-between pb-2">
                  <CalendarPrev
                    class="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:bg-accent hover:text-foreground"
                  >
                    <ChevronLeftIcon :size="14" />
                  </CalendarPrev>
                  <CalendarHeading class="text-sm font-semibold text-foreground capitalize" />
                  <CalendarNext
                    class="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:bg-accent hover:text-foreground"
                  >
                    <ChevronRightIcon :size="14" />
                  </CalendarNext>
                </div>

                <CalendarGrid>
                  <CalendarGridHead>
                    <CalendarGridRow class="flex gap-0.5 pb-1">
                      <CalendarHeadCell v-for="day in weekDays" :key="day" class="w-8 text-center text-[11px] text-muted-foreground font-medium">{{
                        day
                      }}</CalendarHeadCell>
                    </CalendarGridRow>
                  </CalendarGridHead>
                  <CalendarGridBody>
                    <CalendarGridRow v-for="(week, wi) in month.weeks" :key="wi" class="flex gap-0.5 mt-0.5">
                      <CalendarCell v-for="day in week" :key="day.toString()" :date="day" class="relative p-0">
                        <CalendarCellTrigger
                          :day="day"
                          :month="month.value"
                          :class="
                            cn(
                              'inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm transition',
                              'hover:bg-accent hover:text-accent-foreground',
                              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                              'data-[selected]:bg-primary data-[selected]:text-primary-foreground data-[selected]:hover:bg-primary data-[selected]:font-semibold',
                              'data-[today]:border data-[today]:border-ring',
                              'data-[outside-month]:text-muted-foreground/40 data-[outside-month]:pointer-events-none',
                              'data-[disabled]:pointer-events-none data-[disabled]:opacity-30',
                            )
                          "
                        />
                      </CalendarCell>
                    </CalendarGridRow>
                  </CalendarGridBody>
                </CalendarGrid>
              </div>
            </div>
          </CalendarRoot>
        </PopoverContent>
      </PopoverPortal>
    </PopoverRoot>

    <p v-if="error" class="text-xs text-destructive">{{ error }}</p>
    <p v-else-if="hint" class="text-xs text-muted-foreground">{{ hint }}</p>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import {
  PopoverRoot,
  PopoverTrigger,
  PopoverContent,
  PopoverPortal,
  CalendarRoot,
  CalendarHeading,
  CalendarGrid,
  CalendarGridHead,
  CalendarGridRow,
  CalendarGridBody,
  CalendarHeadCell,
  CalendarCell,
  CalendarCellTrigger,
  CalendarNext,
  CalendarPrev,
} from "reka-ui";
import { CalendarIcon, ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon, X as XIcon } from "lucide-vue-next";
import { cn } from "@/lib/utils";
import { CalendarDate, parseDate } from "@internationalized/date";

const props = defineProps({
  modelValue: { type: String, default: null },
  label: String,
  placeholder: String,
  hint: String,
  error: String,
  disabled: Boolean,
  required: Boolean,
  clearable: { type: Boolean, default: true },
});

const emit = defineEmits(["update:modelValue"]);
const isOpen = ref(false);

const calendarValue = computed({
  get() {
    if (!props.modelValue) return undefined;
    try {
      const v = props.modelValue;
      if (/^\d{4}-\d{2}-\d{2}/.test(v)) return parseDate(v.slice(0, 10));
      if (/^\d{2}\.\d{2}\.\d{4}/.test(v)) {
        const [d, m, y] = v.split(".");
        return new CalendarDate(Number(y), Number(m), Number(d));
      }
    } catch {}
    return undefined;
  },
  set(val) {
    emit("update:modelValue", val ? val.toString() : null);
  },
});

const ruFormatter = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });

const displayValue = computed(() => {
  if (!props.modelValue) return "";
  try {
    const v = props.modelValue;
    let d;
    if (/^\d{4}-\d{2}-\d{2}/.test(v)) d = new Date(v.slice(0, 10));
    else if (/^\d{2}\.\d{2}\.\d{4}/.test(v)) {
      const [day, mon, yr] = v.split(".");
      d = new Date(`${yr}-${mon}-${day}`);
    }
    if (d && !isNaN(d)) return ruFormatter.format(d);
  } catch {}
  return props.modelValue;
});

const onCalendarSelect = (val) => {
  if (!val) return;
  emit("update:modelValue", val.toString());
  isOpen.value = false;
};

const clear = () => emit("update:modelValue", null);
</script>

<script setup lang="ts">
const model = defineModel<string>({
  required: true
})

const props = withDefaults(defineProps<{
  name: string
  label: string
  description?: string
  editorId: string
  placeholder?: string
  height?: string
  required?: boolean
}>(), {
  description: undefined,
  placeholder: '',
  height: '460px',
  required: false
})

function updateFallbackValue(event: Event) {
  model.value = (event.target as HTMLTextAreaElement).value
}
</script>

<template>
  <AppFormField
    :name="props.name"
    :label="props.label"
    :description="props.description"
  >
    <ClientOnly>
      <AdminMarkdownEditorClient
        v-model="model"
        :editor-id="props.editorId"
        :placeholder="props.placeholder"
        :height="props.height"
      />

      <template #fallback>
        <textarea
          :id="props.name"
          :value="model"
          :required="props.required"
          rows="10"
          class="w-full rounded-lg border border-black/8 bg-white px-4 py-3 text-sm text-highlighted outline-none transition focus:border-black/25 dark:border-white/[0.08] dark:bg-[#111111] dark:focus:border-white/[0.25]"
          :placeholder="props.placeholder"
          @input="updateFallbackValue"
        />
      </template>
    </ClientOnly>
  </AppFormField>
</template>

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
          class="app-inset-field w-full px-3 py-2.5 text-sm leading-6 outline-none"
          :placeholder="props.placeholder"
          @input="updateFallbackValue"
        />
      </template>
    </ClientOnly>
  </AppFormField>
</template>

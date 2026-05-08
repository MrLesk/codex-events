export interface EventGalleryUploadItem {
  id: string
  name: string
}

export function createEventGalleryUploadItems(files: Array<Pick<File, 'name'>>): EventGalleryUploadItem[] {
  return files.map((file, index) => {
    const normalizedName = file.name.trim() || `Photo ${index + 1}`

    return {
      id: `event-gallery-upload-${index}`,
      name: normalizedName
    }
  })
}

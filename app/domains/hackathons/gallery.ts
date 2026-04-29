export interface HackathonGalleryUploadItem {
  id: string
  name: string
}

export function createHackathonGalleryUploadItems(files: Array<Pick<File, 'name'>>): HackathonGalleryUploadItem[] {
  return files.map((file, index) => {
    const normalizedName = file.name.trim() || `Photo ${index + 1}`

    return {
      id: `hackathon-gallery-upload-${index}`,
      name: normalizedName
    }
  })
}

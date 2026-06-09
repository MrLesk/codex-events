let fontsPromise: Promise<{ regular: ArrayBuffer, semiBold: ArrayBuffer }> | null = null

function toArrayBuffer(data: Uint8Array) {
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer
}

async function readCertificateFontOrThrow(fileName: string) {
  const data = await useStorage('assets:server').getItemRaw<Uint8Array>(`fonts/${fileName}`)

  if (!data) {
    throw new Error(`Certificate font asset fonts/${fileName} is missing from the server bundle.`)
  }

  return toArrayBuffer(new Uint8Array(data))
}

export function loadCertificateFonts() {
  fontsPromise ??= (async () => ({
    regular: await readCertificateFontOrThrow('Inter-Regular.ttf'),
    semiBold: await readCertificateFontOrThrow('Inter-SemiBold.ttf')
  }))()

  return fontsPromise
}

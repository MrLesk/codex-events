let badgePromise: Promise<ArrayBuffer> | null = null

export function loadCertificateBadge() {
  badgePromise ??= (async () => {
    const data = await useStorage('assets:server').getItemRaw<Uint8Array>('images/platform-mark-white.png')

    if (!data) {
      throw new Error('Certificate badge asset images/platform-mark-white.png is missing from the server bundle.')
    }

    const bytes = new Uint8Array(data)
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
  })()

  return badgePromise
}

interface ExifAsciiEntry {
  tag: number
  bytes: Uint8Array
}

interface TestExifJpegOptions {
  dateTime?: string
  dateTimeOriginal?: string
  dateTimeDigitized?: string
  offsetTime?: string
  offsetTimeOriginal?: string
  offsetTimeDigitized?: string
}

const textEncoder = new TextEncoder()

function encodeExifAscii(value: string) {
  return textEncoder.encode(`${value}\0`)
}

function createAsciiEntry(tag: number, value: string): ExifAsciiEntry {
  return {
    tag,
    bytes: encodeExifAscii(value)
  }
}

function writeUint16(view: DataView, offset: number, value: number) {
  view.setUint16(offset, value, true)
}

function writeUint32(view: DataView, offset: number, value: number) {
  view.setUint32(offset, value, true)
}

function writeAsciiEntry(
  view: DataView,
  tiff: Uint8Array,
  offset: number,
  entry: ExifAsciiEntry,
  valueOffset: number
) {
  writeUint16(view, offset, entry.tag)
  writeUint16(view, offset + 2, 2)
  writeUint32(view, offset + 4, entry.bytes.byteLength)
  writeUint32(view, offset + 8, valueOffset)
  tiff.set(entry.bytes, valueOffset)

  return valueOffset + entry.bytes.byteLength
}

function writeLongEntry(view: DataView, offset: number, tag: number, value: number) {
  writeUint16(view, offset, tag)
  writeUint16(view, offset + 2, 4)
  writeUint32(view, offset + 4, 1)
  writeUint32(view, offset + 8, value)
}

export function createExifJpegBytes(options: TestExifJpegOptions = {}) {
  const ifd0AsciiEntries: ExifAsciiEntry[] = []
  const exifAsciiEntries: ExifAsciiEntry[] = []

  if (options.dateTime) {
    ifd0AsciiEntries.push(createAsciiEntry(0x0132, options.dateTime))
  }

  if (options.dateTimeOriginal) {
    exifAsciiEntries.push(createAsciiEntry(0x9003, options.dateTimeOriginal))
  }

  if (options.dateTimeDigitized) {
    exifAsciiEntries.push(createAsciiEntry(0x9004, options.dateTimeDigitized))
  }

  if (options.offsetTime) {
    exifAsciiEntries.push(createAsciiEntry(0x9010, options.offsetTime))
  }

  if (options.offsetTimeOriginal) {
    exifAsciiEntries.push(createAsciiEntry(0x9011, options.offsetTimeOriginal))
  }

  if (options.offsetTimeDigitized) {
    exifAsciiEntries.push(createAsciiEntry(0x9012, options.offsetTimeDigitized))
  }

  const hasExifIfd = exifAsciiEntries.length > 0
  const ifd0Offset = 8
  const ifd0EntryCount = ifd0AsciiEntries.length + (hasExifIfd ? 1 : 0)
  const ifd0Length = 2 + (ifd0EntryCount * 12) + 4
  const exifIfdOffset = ifd0Offset + ifd0Length
  const exifIfdLength = hasExifIfd ? 2 + (exifAsciiEntries.length * 12) + 4 : 0
  let valueOffset = exifIfdOffset + exifIfdLength
  const valueByteLength = [...ifd0AsciiEntries, ...exifAsciiEntries]
    .reduce((total, entry) => total + entry.bytes.byteLength, 0)
  const tiff = new Uint8Array(valueOffset + valueByteLength)
  const view = new DataView(tiff.buffer)

  tiff.set([0x49, 0x49], 0)
  writeUint16(view, 2, 42)
  writeUint32(view, 4, ifd0Offset)
  writeUint16(view, ifd0Offset, ifd0EntryCount)

  let entryOffset = ifd0Offset + 2

  for (const entry of ifd0AsciiEntries) {
    valueOffset = writeAsciiEntry(view, tiff, entryOffset, entry, valueOffset)
    entryOffset += 12
  }

  if (hasExifIfd) {
    writeLongEntry(view, entryOffset, 0x8769, exifIfdOffset)
    entryOffset += 12
  }

  writeUint32(view, entryOffset, 0)

  if (hasExifIfd) {
    writeUint16(view, exifIfdOffset, exifAsciiEntries.length)
    entryOffset = exifIfdOffset + 2

    for (const entry of exifAsciiEntries) {
      valueOffset = writeAsciiEntry(view, tiff, entryOffset, entry, valueOffset)
      entryOffset += 12
    }

    writeUint32(view, entryOffset, 0)
  }

  const exifHeader = new Uint8Array([0x45, 0x78, 0x69, 0x66, 0x00, 0x00])
  const payloadLength = exifHeader.byteLength + tiff.byteLength
  const segmentLength = payloadLength + 2

  if (segmentLength > 0xffff) {
    throw new Error('Test EXIF payload is too large for one JPEG APP1 segment.')
  }

  const jpeg = new Uint8Array(2 + 2 + 2 + payloadLength + 2)
  let jpegOffset = 0

  jpeg.set([0xff, 0xd8], jpegOffset)
  jpegOffset += 2
  jpeg.set([0xff, 0xe1], jpegOffset)
  jpegOffset += 2
  jpeg[jpegOffset] = Math.floor(segmentLength / 0x100)
  jpeg[jpegOffset + 1] = segmentLength % 0x100
  jpegOffset += 2
  jpeg.set(exifHeader, jpegOffset)
  jpegOffset += exifHeader.byteLength
  jpeg.set(tiff, jpegOffset)
  jpegOffset += tiff.byteLength
  jpeg.set([0xff, 0xd9], jpegOffset)

  return jpeg
}

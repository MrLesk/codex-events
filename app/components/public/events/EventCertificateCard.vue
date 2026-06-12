<script setup lang="ts">
import { usePreferredReducedMotion } from '@vueuse/core'

import type { EventCertificate } from '#shared/domains/events/certificates'
import {
  formatEventCertificatePlacement,
  resolveEventCertificatePlacementTier
} from '#shared/domains/events/certificates'

const props = defineProps<{
  certificate: EventCertificate
  celebrate?: boolean
}>()

const stageElement = ref<HTMLElement | null>(null)
const isPointerActive = ref(false)
const tiltX = ref(0)
const tiltY = ref(0)
const glareX = ref(50)
const glareY = ref(30)
const reducedMotion = usePreferredReducedMotion()

const tiltTarget = { x: 0, y: 0, glareX: 50, glareY: 30 }
let tiltFrame = 0

function stopTiltLoop() {
  if (tiltFrame) {
    cancelAnimationFrame(tiltFrame)
    tiltFrame = 0
  }
}

function runTiltLoop() {
  tiltFrame = 0
  tiltX.value += (tiltTarget.x - tiltX.value) * 0.18
  tiltY.value += (tiltTarget.y - tiltY.value) * 0.18
  glareX.value += (tiltTarget.glareX - glareX.value) * 0.18
  glareY.value += (tiltTarget.glareY - glareY.value) * 0.18

  const settled = Math.abs(tiltTarget.x - tiltX.value) < 0.01 && Math.abs(tiltTarget.y - tiltY.value) < 0.01

  if (!settled && isPointerActive.value) {
    tiltFrame = requestAnimationFrame(runTiltLoop)
  }
}

function handlePointerMove(event: PointerEvent) {
  const element = stageElement.value

  if (!element || reducedMotion.value === 'reduce') {
    return
  }

  const rect = element.getBoundingClientRect()
  const pointerX = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
  const pointerY = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height))

  isPointerActive.value = true
  tiltTarget.x = (pointerX - 0.5) * 12
  tiltTarget.y = (0.5 - pointerY) * 10
  tiltTarget.glareX = pointerX * 100
  tiltTarget.glareY = pointerY * 100

  if (!tiltFrame) {
    tiltFrame = requestAnimationFrame(runTiltLoop)
  }
}

function resetTilt() {
  stopTiltLoop()
  isPointerActive.value = false
  tiltTarget.x = 0
  tiltTarget.y = 0
  tiltTarget.glareX = 50
  tiltTarget.glareY = 30
  tiltX.value = 0
  tiltY.value = 0
  glareX.value = 50
  glareY.value = 30
}

onBeforeUnmount(stopTiltLoop)

const cardStyle = computed(() => ({
  transform: `rotateX(${tiltY.value.toFixed(2)}deg) rotateY(${tiltX.value.toFixed(2)}deg)`,
  transition: isPointerActive.value ? 'none' : 'transform 700ms cubic-bezier(0.2, 0.8, 0.2, 1)'
}))

const glareStyle = computed(() => ({
  background: `radial-gradient(circle at ${glareX.value.toFixed(1)}% ${glareY.value.toFixed(1)}%, rgba(255, 255, 255, 0.26) 0%, rgba(255, 255, 255, 0.06) 30%, rgba(255, 255, 255, 0) 60%)`,
  opacity: isPointerActive.value ? 1 : 0.6
}))

const sheenStyle = computed(() => ({
  backgroundPosition: `${(50 + tiltX.value * 5).toFixed(1)}% 0%`
}))

const isCelebrating = ref(false)
let celebrationTimeout: ReturnType<typeof setTimeout> | undefined

watch(() => props.celebrate, (celebrate) => {
  if (!celebrate) {
    return
  }

  isCelebrating.value = true
  clearTimeout(celebrationTimeout)
  celebrationTimeout = setTimeout(() => {
    isCelebrating.value = false
  }, 2400)
})

onBeforeUnmount(() => clearTimeout(celebrationTimeout))

const celebrationSparks = [
  { left: '24%', top: '30%', dx: '-90px', dy: '-110px', delay: '0ms', color: '#ffe9a8' },
  { left: '50%', top: '18%', dx: '10px', dy: '-130px', delay: '60ms', color: '#ffffff' },
  { left: '74%', top: '28%', dx: '110px', dy: '-90px', delay: '120ms', color: '#c4b5ff' },
  { left: '14%', top: '52%', dx: '-130px', dy: '-10px', delay: '90ms', color: '#ffffff' },
  { left: '86%', top: '50%', dx: '130px', dy: '-20px', delay: '40ms', color: '#ffe9a8' },
  { left: '30%', top: '74%', dx: '-100px', dy: '90px', delay: '150ms', color: '#c4b5ff' },
  { left: '52%', top: '82%', dx: '0px', dy: '120px', delay: '110ms', color: '#ffe9a8' },
  { left: '72%', top: '72%', dx: '110px', dy: '90px', delay: '30ms', color: '#ffffff' },
  { left: '40%', top: '24%', dx: '-50px', dy: '-120px', delay: '180ms', color: '#ffe9a8' },
  { left: '62%', top: '22%', dx: '60px', dy: '-115px', delay: '200ms', color: '#ffffff' },
  { left: '20%', top: '40%', dx: '-120px', dy: '-60px', delay: '230ms', color: '#ffffff' },
  { left: '80%', top: '38%', dx: '120px', dy: '-60px', delay: '170ms', color: '#c4b5ff' }
] as const

const placementTier = computed(() => props.certificate.placement
  ? resolveEventCertificatePlacementTier(props.certificate.placement)
  : null)
const placementLabel = computed(() => props.certificate.placement
  ? formatEventCertificatePlacement(props.certificate.placement).toUpperCase()
  : '')

const participantNameSize = computed(() => {
  const length = props.certificate.participantName.length

  if (length <= 14) {
    return '7.4cqw'
  }

  if (length <= 22) {
    return '5.9cqw'
  }

  if (length <= 32) {
    return '4.1cqw'
  }

  return '3.3cqw'
})
</script>

<template>
  <div
    class="certificate-card-stage relative w-full"
    :class="`certificate-card-stage--${certificate.eventType}`"
    data-testid="event-certificate-card"
  >
    <div
      ref="stageElement"
      class="certificate-card-perspective"
      @pointermove="handlePointerMove"
      @pointerleave="resetTilt"
      @pointercancel="resetTilt"
    >
      <div
        class="certificate-card text-left"
        :class="{ 'certificate-card--celebrating': isCelebrating }"
        :style="cardStyle"
        role="img"
        :aria-label="`${certificate.participantName} — Certificate of Participation, ${certificate.eventName}`"
      >
        <div
          class="certificate-card__grid"
          aria-hidden="true"
        />
        <div
          class="certificate-card__dots certificate-card__dots--top"
          aria-hidden="true"
        />
        <div
          class="certificate-card__dots certificate-card__dots--right"
          aria-hidden="true"
        />
        <div
          class="certificate-card__rings"
          aria-hidden="true"
        />
        <div
          class="certificate-card__sheen"
          :class="{ 'certificate-card__sheen--celebrating': isCelebrating }"
          :style="sheenStyle"
          aria-hidden="true"
        />
        <div
          class="certificate-card__glare"
          :style="glareStyle"
          aria-hidden="true"
        />
        <span
          class="certificate-card__spark left-[26%] top-[18%] text-[1.7cqw]"
          aria-hidden="true"
        >+</span>
        <span
          class="certificate-card__spark left-[8%] top-[62%] text-[1.3cqw]"
          aria-hidden="true"
        >+</span>
        <span
          class="certificate-card__spark left-[58%] top-[12%] text-[1.2cqw]"
          aria-hidden="true"
        >+</span>

        <svg
          class="certificate-card__mark absolute right-[5.5cqw] top-[24%] z-0 w-[9.5cqw]"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <linearGradient
              id="certificate-mark-gradient"
              x1="12"
              y1="3"
              x2="12"
              y2="21"
              gradientUnits="userSpaceOnUse"
            >
              <stop stop-color="#B1A7FF" />
              <stop
                offset="0.5"
                stop-color="#7A9DFF"
              />
              <stop
                offset="1"
                stop-color="#3941FF"
              />
            </linearGradient>
          </defs>
          <path
            d="M9.064 3.344a4.578 4.578 0 012.285-.312c1 .115 1.891.54 2.673 1.275.01.01.024.017.037.021a.09.09 0 00.043 0 4.55 4.55 0 013.046.275l.047.022.116.057a4.581 4.581 0 012.188 2.399c.209.51.313 1.041.315 1.595a4.24 4.24 0 01-.134 1.223.123.123 0 00.03.115c.594.607.988 1.33 1.183 2.17.289 1.425-.007 2.71-.887 3.854l-.136.166a4.548 4.548 0 01-2.201 1.388.123.123 0 00-.081.076c-.191.551-.383 1.023-.74 1.494-.9 1.187-2.222 1.846-3.711 1.838-1.187-.006-2.239-.44-3.157-1.302a.107.107 0 00-.105-.024c-.388.125-.78.143-1.204.138a4.441 4.441 0 01-1.945-.466 4.544 4.544 0 01-1.61-1.335c-.152-.202-.303-.392-.414-.617a5.81 5.81 0 01-.37-.961 4.582 4.582 0 01-.014-2.298.124.124 0 00.006-.056.085.085 0 00-.027-.048 4.467 4.467 0 01-1.034-1.651 3.896 3.896 0 01-.251-1.192 5.189 5.189 0 01.141-1.6c.337-1.112.982-1.985 1.933-2.618.212-.141.413-.251.601-.33.215-.089.43-.164.646-.227a.098.098 0 00.065-.066 4.51 4.51 0 01.829-1.615 4.535 4.535 0 011.837-1.388zm3.482 10.565a.637.637 0 000 1.272h3.636a.637.637 0 100-1.272h-3.636zM8.462 9.23a.637.637 0 00-1.106.631l1.272 2.224-1.266 2.136a.636.636 0 101.095.649l1.454-2.455a.636.636 0 00.005-.64L8.462 9.23z"
            fill="url(#certificate-mark-gradient)"
          />
          <path
            d="M12.546 13.909a.637.637 0 000 1.272h3.636a.637.637 0 100-1.272h-3.636zM8.462 9.23a.637.637 0 00-1.106.631l1.272 2.224-1.266 2.136a.636.636 0 101.095.649l1.454-2.455a.636.636 0 00.005-.64L8.462 9.23z"
            fill="#ffffff"
          />
        </svg>

        <div
          class="relative z-10 flex h-full flex-col px-[4.4cqw] py-[3.4cqw]"
          aria-hidden="true"
        >
          <p class="text-[max(9px,1.45cqw)] font-semibold leading-[1.5] tracking-[0.42em] text-white/90">
            CODEX<br>EVENTS
          </p>

          <div class="flex flex-1 flex-col items-center justify-center text-center">
            <p
              v-if="placementTier"
              class="certificate-card__placement mb-[1.3cqw]"
              :class="`certificate-card__placement--${placementTier}`"
              data-testid="certificate-card-placement"
            >
              <AppIcon
                name="i-lucide-trophy"
                class="size-[1.5cqw]"
              />
              {{ placementLabel }}
            </p>
            <p class="text-[max(8px,1.45cqw)] font-semibold tracking-[0.4em] text-white/90">
              CERTIFICATE OF PARTICIPATION
            </p>
            <p
              class="certificate-card__name mt-[1.6cqw] max-w-[68cqw] font-semibold uppercase leading-[1.08] tracking-[0.05em]"
              :style="{ fontSize: participantNameSize }"
            >
              {{ certificate.participantName }}
            </p>
            <p class="mt-[2cqw] rounded-full border border-white/55 px-[2.6cqw] py-[0.85cqw] text-[max(8px,1.4cqw)] font-semibold uppercase tracking-[0.34em] text-white/90">
              {{ certificate.eventName }}
            </p>
          </div>

          <div class="flex items-center">
            <div class="flex items-center gap-[1.1cqw]">
              <span class="certificate-card__icon-tile">
                <AppIcon
                  name="i-lucide-calendar-days"
                  class="size-[1.7cqw]"
                />
              </span>
              <span class="flex flex-col gap-[0.4cqw]">
                <span class="text-[max(7px,1cqw)] font-semibold tracking-[0.28em] text-white/85">EVENT DATE</span>
                <span class="text-[max(9px,1.5cqw)] font-semibold text-white">{{ certificate.eventDateLabel }}</span>
              </span>
            </div>

            <template v-if="certificate.trackName">
              <div class="certificate-card__divider" />
              <div class="flex min-w-0 items-center gap-[1.1cqw]">
                <span class="certificate-card__icon-tile">
                  <AppIcon
                    name="i-lucide-wrench"
                    class="size-[1.7cqw]"
                  />
                </span>
                <span class="flex min-w-0 flex-col gap-[0.4cqw]">
                  <span class="text-[max(7px,1cqw)] font-semibold tracking-[0.28em] text-white/85">TRACK</span>
                  <span class="truncate text-[max(9px,1.5cqw)] font-semibold text-white">{{ certificate.trackName }}</span>
                </span>
              </div>
            </template>

            <div class="certificate-card__divider" />
            <div class="flex items-center gap-[1.1cqw]">
              <span class="certificate-card__icon-tile">
                <AppIcon
                  name="i-lucide-shield-check"
                  class="size-[1.7cqw]"
                />
              </span>
              <span class="flex flex-col gap-[0.4cqw]">
                <span class="text-[max(7px,1cqw)] font-semibold tracking-[0.28em] text-white/85">CERTIFICATE ID</span>
                <span class="text-[max(9px,1.5cqw)] font-semibold text-white">{{ certificate.certificateId }}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="isCelebrating"
      class="pointer-events-none absolute inset-0 z-20"
      aria-hidden="true"
    >
      <span
        v-for="(spark, index) in celebrationSparks"
        :key="index"
        class="certificate-card__celebration-spark"
        :style="{ left: spark.left, top: spark.top, color: spark.color, animationDelay: spark.delay, '--spark-dx': spark.dx, '--spark-dy': spark.dy }"
      />
    </div>

    <div
      class="certificate-card__reflection"
      aria-hidden="true"
    />
  </div>
</template>

<style scoped>
.certificate-card-stage {
  container-type: inline-size;
}

.certificate-card-perspective {
  perspective: 1400px;
  touch-action: pan-y;
}

.certificate-card {
  position: relative;
  aspect-ratio: 2.35 / 1;
  border-radius: clamp(14px, 2.6cqw, 30px);
  border: 1.5px solid var(--certificate-frame);
  overflow: hidden;
  will-change: transform;
  background:
    radial-gradient(90% 160% at 0% 0%, var(--certificate-glow-left) 0%, rgba(0, 0, 0, 0) 55%),
    radial-gradient(95% 170% at 100% 100%, var(--certificate-glow-right) 0%, rgba(0, 0, 0, 0) 58%),
    linear-gradient(112deg, var(--certificate-from) 0%, var(--certificate-via) 48%, var(--certificate-to) 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.5),
    inset 0 0 70px rgba(255, 255, 255, 0.07),
    0 0 50px -6px var(--certificate-edge-glow),
    0 38px 90px -22px rgba(0, 0, 0, 0.85);
}

.certificate-card-stage--build {
  --certificate-from: #0a1186;
  --certificate-via: #4a22c9;
  --certificate-to: #a23ee6;
  --certificate-glow-left: rgba(48, 92, 255, 0.5);
  --certificate-glow-right: rgba(214, 80, 244, 0.5);
  --certificate-frame: rgba(196, 208, 255, 0.7);
  --certificate-edge-glow: rgba(124, 92, 255, 0.55);
  --certificate-dot: rgba(150, 190, 255, 0.55);
}

.certificate-card-stage--hackathon {
  --certificate-from: #470c8f;
  --certificate-via: #7c1fc2;
  --certificate-to: #cc3680;
  --certificate-glow-left: rgba(157, 78, 255, 0.6);
  --certificate-glow-right: rgba(255, 94, 161, 0.5);
  --certificate-frame: rgba(238, 204, 255, 0.65);
  --certificate-edge-glow: rgba(199, 78, 255, 0.5);
  --certificate-dot: rgba(255, 170, 220, 0.5);
}

.certificate-card-stage--meetup {
  --certificate-from: #024a87;
  --certificate-via: #0b6dbd;
  --certificate-to: #2fadd6;
  --certificate-glow-left: rgba(40, 150, 255, 0.6);
  --certificate-glow-right: rgba(94, 224, 255, 0.5);
  --certificate-frame: rgba(196, 235, 255, 0.65);
  --certificate-edge-glow: rgba(56, 170, 255, 0.5);
  --certificate-dot: rgba(150, 220, 255, 0.55);
}

.certificate-card__grid {
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(120% 140% at 50% 50%, rgba(0, 0, 0, 0) 55%, rgba(8, 6, 40, 0.5) 100%),
    linear-gradient(rgba(255, 255, 255, 0.055) 1px, rgba(0, 0, 0, 0) 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.055) 1px, rgba(0, 0, 0, 0) 1px);
  background-size: 100% 100%, 2.4cqw 2.4cqw, 2.4cqw 2.4cqw;
  pointer-events: none;
}

.certificate-card__dots {
  position: absolute;
  background-image: radial-gradient(circle at 0.35cqw 0.35cqw, var(--certificate-dot) 0.22cqw, rgba(0, 0, 0, 0) 0.26cqw);
  background-size: 1.5cqw 1.5cqw;
  pointer-events: none;
}

.certificate-card__dots--top {
  top: 6%;
  left: 3.5%;
  width: 24%;
  height: 42%;
  mask-image: radial-gradient(120% 120% at 0% 0%, #000 30%, rgba(0, 0, 0, 0) 75%);
}

.certificate-card__dots--right {
  right: 2.5%;
  bottom: 8%;
  width: 26%;
  height: 70%;
  mask-image: radial-gradient(130% 130% at 100% 60%, #000 30%, rgba(0, 0, 0, 0) 78%);
}

.certificate-card__rings {
  position: absolute;
  left: 50%;
  top: 46%;
  width: 46cqw;
  height: 46cqw;
  transform: translate(-50%, -50%);
  border-radius: 9999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  pointer-events: none;
}

.certificate-card__rings::after {
  content: '';
  position: absolute;
  inset: 16%;
  border-radius: 9999px;
  border: 1px solid rgba(255, 255, 255, 0.10);
}

.certificate-card__placement {
  display: inline-flex;
  align-items: center;
  gap: 0.7cqw;
  border-radius: 9999px;
  border: 1px solid;
  padding: 0.55cqw 1.8cqw;
  font-size: 1.25cqw;
  font-weight: 600;
  letter-spacing: 0.3em;
}

.certificate-card__placement--gold {
  color: #ffe9a8;
  border-color: rgba(255, 214, 110, 0.75);
  background: rgba(120, 84, 12, 0.4);
  box-shadow: 0 0 1.8cqw rgba(255, 200, 80, 0.45);
}

.certificate-card__placement--silver {
  color: #eef2f8;
  border-color: rgba(226, 232, 240, 0.72);
  background: rgba(82, 92, 108, 0.42);
  box-shadow: 0 0 1.8cqw rgba(214, 224, 238, 0.4);
}

.certificate-card__placement--bronze {
  color: #ffd9b8;
  border-color: rgba(228, 168, 112, 0.72);
  background: rgba(112, 62, 20, 0.45);
  box-shadow: 0 0 1.8cqw rgba(238, 162, 90, 0.4);
}

.certificate-card__sheen {
  position: absolute;
  inset: 0;
  background-image: linear-gradient(112deg, rgba(255, 255, 255, 0) 36%, rgba(255, 255, 255, 0.30) 48%, rgba(255, 255, 255, 0.05) 55%, rgba(255, 255, 255, 0) 66%);
  background-size: 220% 100%;
  mix-blend-mode: screen;
  pointer-events: none;
}

.certificate-card__glare {
  position: absolute;
  inset: 0;
  mix-blend-mode: overlay;
  transition: opacity 400ms ease;
  pointer-events: none;
}

.certificate-card__spark {
  position: absolute;
  color: rgba(255, 255, 255, 0.75);
  font-weight: 300;
  line-height: 1;
  pointer-events: none;
}

.certificate-card__mark {
  filter: drop-shadow(0 0 1.6cqw rgba(170, 150, 255, 0.65));
  opacity: 0.95;
}

.certificate-card__name {
  background-image: linear-gradient(180deg, #ffffff 16%, #dfe6ff 52%, #aebcff 100%);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  filter:
    drop-shadow(0 0.35cqw 0.1cqw rgba(20, 16, 70, 0.45))
    drop-shadow(0 0.9cqw 2cqw rgba(30, 20, 120, 0.5));
}

.certificate-card__icon-tile {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3.4cqw;
  height: 3.4cqw;
  border-radius: 0.8cqw;
  border: 1px solid rgba(255, 255, 255, 0.35);
  background: rgba(255, 255, 255, 0.10);
  color: #ffffff;
  flex: none;
}

.certificate-card__divider {
  width: 1px;
  height: 3.6cqw;
  margin: 0 3cqw;
  background: rgba(255, 255, 255, 0.28);
  flex: none;
}

.certificate-card--celebrating {
  animation: certificate-card-pop 900ms ease-out;
}

@keyframes certificate-card-pop {
  0% {
    scale: 1;
  }

  35% {
    scale: 1.02;
  }

  100% {
    scale: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .certificate-card--celebrating,
  .certificate-card__sheen--celebrating,
  .certificate-card__celebration-spark {
    animation: none;
  }
}

.certificate-card__sheen--celebrating {
  animation: certificate-sheen-sweep 1.7s ease-in-out;
}

@keyframes certificate-sheen-sweep {
  0% {
    background-position: 175% 0%;
  }

  100% {
    background-position: -75% 0%;
  }
}

.certificate-card__celebration-spark {
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 9999px;
  background: currentColor;
  box-shadow: 0 0 12px currentColor;
  opacity: 0;
  animation: certificate-spark-burst 1.5s ease-out forwards;
}

@keyframes certificate-spark-burst {
  0% {
    opacity: 0;
    transform: translate(0, 0) scale(0.4);
  }

  18% {
    opacity: 1;
  }

  100% {
    opacity: 0;
    transform: translate(var(--spark-dx), var(--spark-dy)) scale(1);
  }
}

.certificate-card__reflection {
  width: 72%;
  height: clamp(20px, 6cqw, 64px);
  margin: clamp(-14px, -2.4cqw, -28px) auto 0;
  border-radius: 9999px;
  background: radial-gradient(50% 100% at 50% 0%, var(--certificate-edge-glow, rgba(124, 92, 255, 0.5)) 0%, rgba(0, 0, 0, 0) 75%);
  filter: blur(14px);
  opacity: 0.8;
}
</style>

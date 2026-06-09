<script setup lang="ts">
import { usePreferredReducedMotion } from '@vueuse/core'

import type { EventCertificate } from '#shared/domains/events/certificates'

const props = defineProps<{
  certificate: EventCertificate
}>()

const cardElement = ref<HTMLElement | null>(null)
const isPointerActive = ref(false)
const tiltX = ref(0)
const tiltY = ref(0)
const glareX = ref(50)
const glareY = ref(30)
const reducedMotion = usePreferredReducedMotion()

function handlePointerMove(event: PointerEvent) {
  const element = cardElement.value

  if (!element || reducedMotion.value === 'reduce') {
    return
  }

  const rect = element.getBoundingClientRect()
  const pointerX = (event.clientX - rect.left) / rect.width
  const pointerY = (event.clientY - rect.top) / rect.height

  isPointerActive.value = true
  tiltX.value = (pointerX - 0.5) * 12
  tiltY.value = (0.5 - pointerY) * 10
  glareX.value = pointerX * 100
  glareY.value = pointerY * 100
}

function resetTilt() {
  isPointerActive.value = false
  tiltX.value = 0
  tiltY.value = 0
  glareX.value = 50
  glareY.value = 30
}

const cardStyle = computed(() => ({
  transform: `rotateX(${tiltY.value.toFixed(2)}deg) rotateY(${tiltX.value.toFixed(2)}deg)`,
  transition: isPointerActive.value ? 'transform 90ms linear' : 'transform 700ms cubic-bezier(0.2, 0.8, 0.2, 1)'
}))

const glareStyle = computed(() => ({
  background: `radial-gradient(circle at ${glareX.value.toFixed(1)}% ${glareY.value.toFixed(1)}%, rgba(255, 255, 255, 0.26) 0%, rgba(255, 255, 255, 0.06) 30%, rgba(255, 255, 255, 0) 60%)`,
  opacity: isPointerActive.value ? 1 : 0.6
}))

const sheenStyle = computed(() => ({
  backgroundPosition: `${(50 + tiltX.value * 5).toFixed(1)}% 0%`
}))

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
    class="certificate-card-stage w-full"
    :class="`certificate-card-stage--${certificate.eventType}`"
    data-testid="event-certificate-card"
  >
    <div class="certificate-card-perspective">
      <div
        ref="cardElement"
        class="certificate-card text-left"
        :style="cardStyle"
        @pointermove="handlePointerMove"
        @pointerleave="resetTilt"
        @pointercancel="resetTilt"
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
          class="certificate-card__mark absolute right-[5.5cqw] top-[30%] z-0 w-[13.5cqw]"
          viewBox="0 0 300 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <linearGradient
              id="certificate-mark-fill"
              x1="40"
              y1="0"
              x2="280"
              y2="200"
              gradientUnits="userSpaceOnUse"
            >
              <stop
                offset="0"
                stop-color="#ffffff"
                stop-opacity="0.95"
              />
              <stop
                offset="0.45"
                stop-color="#c4b5ff"
                stop-opacity="0.92"
              />
              <stop
                offset="1"
                stop-color="#8e7bff"
                stop-opacity="0.9"
              />
            </linearGradient>
          </defs>
          <path
            d="M168 200H279C282.542 200 285.932 198.756 289 197C292.068 195.244 295.23 193.041 297 190C298.77 186.959 300.002 183.51 300 179.999C299.998 176.488 298.773 173.04 297 170.001L222 41C220.23 37.96 218.067 35.7552 215 34C211.933 32.2448 207.542 31 204 31C200.458 31 197.067 32.2448 194 34C190.933 35.7552 188.77 37.96 187 41L168 74L130 9.99764C128.228 6.95784 126.068 3.75491 123 2C119.932 0.245087 116.542 0 113 0C109.458 0 106.068 0.245087 103 2C99.9323 3.75491 96.7717 6.95784 95 9.99764L2 170.001C0.226979 173.04 0.00154312 176.488 1.90993e-06 179.999C-0.0015393 183.51 0.229648 186.959 2 190C3.77035 193.04 6.93245 195.244 10 197C13.0675 198.756 16.4578 200 20 200H90C117.737 200 137.925 187.558 152 164L186 105L204 74L259 168H186L168 200ZM89 168H40L113 42L150 105L125.491 147.725C116.144 163.01 105.488 168 89 168Z"
            fill="url(#certificate-mark-fill)"
          />
        </svg>

        <div class="relative z-10 flex h-full flex-col px-[4.4cqw] py-[3.4cqw]">
          <p class="text-[1.45cqw] font-semibold leading-[1.5] tracking-[0.42em] text-white/90">
            CODEX<br>EVENTS
          </p>

          <div class="flex flex-1 flex-col items-center justify-center text-center">
            <p class="text-[1.45cqw] font-semibold tracking-[0.4em] text-white/85">
              CERTIFICATE OF PARTICIPATION
            </p>
            <p
              class="certificate-card__name mt-[1.6cqw] max-w-[68cqw] font-semibold uppercase leading-[1.08] tracking-[0.05em]"
              :style="{ fontSize: participantNameSize }"
            >
              {{ certificate.participantName }}
            </p>
            <p class="mt-[2cqw] rounded-full border border-white/55 px-[2.6cqw] py-[0.85cqw] text-[1.4cqw] font-semibold uppercase tracking-[0.34em] text-white/90">
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
                <span class="text-[1cqw] font-semibold tracking-[0.28em] text-white/60">EVENT DATE</span>
                <span class="text-[1.5cqw] font-semibold text-white">{{ certificate.eventDateLabel }}</span>
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
                  <span class="text-[1cqw] font-semibold tracking-[0.28em] text-white/60">TRACK</span>
                  <span class="truncate text-[1.5cqw] font-semibold text-white">{{ certificate.trackName }}</span>
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
                <span class="text-[1cqw] font-semibold tracking-[0.28em] text-white/60">CERTIFICATE ID</span>
                <span class="text-[1.5cqw] font-semibold text-white">{{ certificate.certificateId }}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
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
}

.certificate-card {
  position: relative;
  aspect-ratio: 2.35 / 1;
  border-radius: clamp(14px, 2.6cqw, 30px);
  border: 1.5px solid var(--certificate-frame);
  overflow: hidden;
  transform-style: preserve-3d;
  touch-action: pan-y;
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

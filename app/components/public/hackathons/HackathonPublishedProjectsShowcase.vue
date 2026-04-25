<script setup lang="ts">
import type { PublishedProjectEntry } from '~/utils/admin-workspace'

import { getPublishedHackathonRosterLinks } from '~/utils/hackathon-published-roster'

const props = withDefaults(defineProps<{
  projects: PublishedProjectEntry[]
  title?: string
  description?: string
  emptyTitle?: string
  emptyDescription?: string
}>(), {
  title: 'Published projects',
  description: 'These teams chose to share their completed projects publicly. They are separate from the official winners.',
  emptyTitle: 'No additional projects published',
  emptyDescription: 'No other teams have chosen to publish their completed projects yet.'
})
</script>

<template>
  <section
    class="!border !border-black/10 !bg-white/72 !shadow-[0_20px_40px_-24px_rgba(15,23,42,0.4)] !backdrop-blur-xl dark:!border-white/[0.10] dark:!bg-[#101010]/60 rounded-xl p-6"
    data-testid="hackathon-published-projects-showcase"
  >
    <div class="space-y-1">
      <h2 class="text-[16px] font-medium text-highlighted dark:text-white">
        {{ props.title }}
      </h2>
      <p class="text-[14px] text-neutral-600 dark:text-[#A3A3A3]">
        {{ props.description }}
      </p>
    </div>

    <AppAlert
      v-if="props.projects.length === 0"
      class="mt-5"
      color="neutral"
      variant="soft"
      :title="props.emptyTitle"
      :description="props.emptyDescription"
    />

    <div
      v-else
      class="mt-5 space-y-4"
    >
      <article
        v-for="project in props.projects"
        :key="project.submissionId"
        :data-testid="`hackathon-published-project-${project.submissionId}`"
        class="!border !border-black/8 !bg-white/78 !shadow-[0_12px_32px_-28px_rgba(15,23,42,0.5)] !backdrop-blur-xl dark:!border-white/[0.10] dark:!bg-[#151515]/64 space-y-5 rounded-xl p-5"
      >
        <div class="space-y-3 border-b border-black/8 pb-4 dark:border-white/[0.08]">
          <div class="flex flex-wrap items-center gap-2">
            <AppBadge
              color="neutral"
              variant="soft"
              class="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]"
            >
              Published project
            </AppBadge>
          </div>

          <div class="space-y-1">
            <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              Team project
            </p>
            <h3 class="text-xl font-semibold text-highlighted dark:text-white">
              {{ project.projectName ?? 'Untitled project' }}
            </h3>
            <p class="text-sm text-neutral-600 dark:text-[#A3A3A3]">
              Team {{ project.teamName }}
            </p>
          </div>
        </div>

        <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start">
          <div class="min-w-0 space-y-4">
            <div class="space-y-2">
              <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                Project description
              </p>
              <AppMarkdownRenderer
                v-if="project.summary?.trim()"
                :source="project.summary"
              />
              <p
                v-else
                class="text-sm leading-7 text-neutral-700 dark:text-[#C7C7C7]"
              >
                No project description is available for this published project yet.
              </p>
            </div>

            <div
              v-if="project.repositoryUrl || project.demoUrl"
              class="flex flex-wrap gap-3"
            >
              <AppButton
                v-if="project.repositoryUrl"
                :to="project.repositoryUrl"
                target="_blank"
                rel="noreferrer"
                color="primary"
                variant="soft"
                icon="i-lucide-github"
                trailing-icon="i-lucide-external-link"
                class="rounded-lg"
              >
                Source code
              </AppButton>

              <AppButton
                v-if="project.demoUrl"
                :to="project.demoUrl"
                target="_blank"
                rel="noreferrer"
                color="neutral"
                variant="outline"
                icon="i-lucide-monitor-play"
                trailing-icon="i-lucide-external-link"
                class="rounded-lg"
              >
                Live demo
              </AppButton>
            </div>
          </div>

          <div class="space-y-3">
            <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
              Team members
            </p>

            <div
              v-if="project.teamMembers.length > 0"
              class="space-y-3"
            >
              <article
                v-for="member in project.teamMembers"
                :key="member.id"
                class="!border !border-black/8 !bg-white/78 !shadow-[0_12px_32px_-28px_rgba(15,23,42,0.5)] !backdrop-blur-xl dark:!border-white/[0.10] dark:!bg-[#151515]/64 flex items-center gap-3 rounded-xl p-4"
              >
                <AppAvatar
                  size="lg"
                  :src="member.profileIconUrl ?? undefined"
                  :alt="member.fullName"
                  class="shrink-0"
                />

                <div class="min-w-0 flex-1 space-y-3">
                  <div class="space-y-1">
                    <h4 class="text-sm font-semibold text-highlighted dark:text-white">
                      {{ member.fullName }}
                    </h4>
                    <p
                      v-if="member.bio"
                      class="text-sm leading-6 text-neutral-700 dark:text-[#C7C7C7]"
                    >
                      {{ member.bio }}
                    </p>
                  </div>

                  <div
                    v-if="getPublishedHackathonRosterLinks(member).length > 0"
                    class="flex flex-wrap gap-2"
                  >
                    <a
                      v-for="link in getPublishedHackathonRosterLinks(member)"
                      :key="link.key"
                      :href="link.href"
                      target="_blank"
                      rel="noreferrer"
                      class="inline-flex items-center gap-1 rounded-full border border-black/10 px-3 py-1 text-sm text-sky-700 transition hover:border-black/20 hover:text-sky-800 dark:border-white/[0.12] dark:text-sky-300 dark:hover:border-white/[0.22] dark:hover:text-sky-200"
                    >
                      {{ link.label }}
                      <AppIcon
                        name="i-lucide-external-link"
                        class="size-3"
                      />
                    </a>
                  </div>
                </div>
              </article>
            </div>
            <p
              v-else
              class="text-sm text-neutral-600 dark:text-[#A3A3A3]"
            >
              No team members are published for this project.
            </p>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

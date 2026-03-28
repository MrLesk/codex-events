<script setup lang="ts">
import type {
  AdminOperationalTeam,
  HackathonState
} from '~/utils/admin-workspace'

import { getAdminSubmissionInterventionPolicy } from '~/utils/admin-workspace'

const props = defineProps<{
  hackathonState: HackathonState
  teams: AdminOperationalTeam[]
  isLoading?: boolean
  errorMessage?: string
  pendingActionKey?: string | null
}>()

const emit = defineEmits<{
  adminWithdraw: [payload: { teamId: string, requestedByUserId: string, reason?: string }]
  disqualify: [payload: { teamId: string, reason?: string }]
}>()

const drafts = reactive<Record<string, {
  requestedByUserId: string
  adminWithdrawReason: string
  disqualifyReason: string
}>>({})

function getDraft(team: AdminOperationalTeam) {
  const existing = drafts[team.team.id]

  if (existing) {
    if (!existing.requestedByUserId && team.activeAdminChoices[0]) {
      existing.requestedByUserId = team.activeAdminChoices[0].userId
    }

    return existing
  }

  const next = {
    requestedByUserId: team.activeAdminChoices[0]?.userId ?? '',
    adminWithdrawReason: '',
    disqualifyReason: ''
  }

  drafts[team.team.id] = next
  return next
}

const withdrawableTeams = computed(() =>
  props.teams.filter(team => getAdminSubmissionInterventionPolicy(props.hackathonState, team.submissionStatus).canAdminWithdraw)
)
const disqualifiableTeams = computed(() =>
  props.teams.filter(team => getAdminSubmissionInterventionPolicy(props.hackathonState, team.submissionStatus).canDisqualify)
)
</script>

<template>
  <AppCard class="rounded-xl hackathon-workspace-detail-panel">
    <template #header>
      <div class="space-y-1">
        <h2 class="text-lg font-semibold text-highlighted">
          Admin Interventions
        </h2>
        <p class="text-sm text-muted">
          Admin-only actions stay separate from participant submission controls and follow the canonical lifecycle guards.
        </p>
      </div>
    </template>

    <div class="space-y-8">
      <AppAlert
        v-if="errorMessage"
        color="error"
        variant="soft"
        title="Interventions unavailable"
        :description="errorMessage"
      />

      <AppAlert
        v-else-if="isLoading"
        color="neutral"
        variant="soft"
        title="Loading interventions"
        description="The admin intervention surface is still loading current team and submission state."
      />

      <template v-else>
        <section class="space-y-3">
          <div class="space-y-1">
            <h3 class="text-sm font-semibold uppercase tracking-[0.18em] text-muted">
              Admin-withdrawal
            </h3>
            <p class="text-sm text-toned">
              Use only when an active team admin has requested withdrawal before judging preparation begins.
            </p>
          </div>

          <div
            v-if="withdrawableTeams.length > 0"
            class="grid gap-4"
          >
            <article
              v-for="team in withdrawableTeams"
              :key="`${team.team.id}-withdraw`"
              :data-testid="`admin-withdraw-team-${team.team.id}`"
              class="rounded-none border-0 bg-transparent dark:border-0 dark:bg-transparent px-5 py-5"
            >
              <div class="space-y-4">
                <div>
                  <h4 class="text-base font-semibold text-highlighted">
                    {{ team.team.name }}
                  </h4>
                  <p class="mt-1 text-sm text-toned">
                    Current submission status: {{ team.submissionStatus }}
                  </p>
                </div>

                <div class="grid gap-4 lg:grid-cols-[0.45fr_0.55fr]">
                  <label class="grid gap-2">
                    <span class="text-sm font-medium text-toned">Requested by team admin</span>
                    <select
                      v-model="getDraft(team).requestedByUserId"
                      class="w-full rounded-lg border border-black/8 bg-white dark:border-white/[0.08] dark:bg-[#111111] focus:border-black/25 dark:focus:border-white/[0.25] px-4 py-3 text-sm text-highlighted outline-none"
                    >
                      <option
                        v-for="choice in team.activeAdminChoices"
                        :key="choice.userId"
                        :value="choice.userId"
                      >
                        {{ choice.label }}
                      </option>
                    </select>
                  </label>

                  <label class="grid gap-2">
                    <span class="text-sm font-medium text-toned">Operational note</span>
                    <input
                      v-model="getDraft(team).adminWithdrawReason"
                      type="text"
                      class="w-full rounded-lg border border-black/8 bg-white dark:border-white/[0.08] dark:bg-[#111111] focus:border-black/25 dark:focus:border-white/[0.25] px-4 py-3 text-sm text-highlighted outline-none"
                      placeholder="Requested by team due to..."
                    >
                  </label>
                </div>

                <AppAlert
                  v-if="team.activeAdminChoices.length === 0"
                  color="warning"
                  variant="soft"
                  title="Team-admin request required"
                  description="This action cannot be issued until the team detail exposes at least one active admin requester."
                />

                <AppButton
                  color="warning"
                  :data-testid="`admin-withdraw-submit-${team.team.id}`"
                  :loading="pendingActionKey === `admin-withdraw:${team.team.id}`"
                  :disabled="team.activeAdminChoices.length === 0 || (pendingActionKey !== null && pendingActionKey !== `admin-withdraw:${team.team.id}`)"
                  @click="emit('adminWithdraw', {
                    teamId: team.team.id,
                    requestedByUserId: getDraft(team).requestedByUserId,
                    reason: getDraft(team).adminWithdrawReason.trim() || undefined
                  })"
                >
                  Admin-withdraw submission
                </AppButton>
              </div>
            </article>
          </div>

          <AppAlert
            v-else
            color="neutral"
            variant="soft"
            title="No admin-withdrawal candidates"
            description="No visible teams are currently in a state that allows admin withdrawal."
          />
        </section>

        <section class="space-y-3">
          <div class="space-y-1">
            <h3 class="text-sm font-semibold uppercase tracking-[0.18em] text-muted">
              Disqualification
            </h3>
            <p class="text-sm text-toned">
              Use only once judge review has started and the submission is already locked for competition.
            </p>
          </div>

          <div
            v-if="disqualifiableTeams.length > 0"
            class="grid gap-4"
          >
            <article
              v-for="team in disqualifiableTeams"
              :key="`${team.team.id}-disqualify`"
              :data-testid="`admin-disqualify-team-${team.team.id}`"
              class="rounded-none border-0 bg-transparent dark:border-0 dark:bg-transparent px-5 py-5"
            >
              <div class="space-y-4">
                <div>
                  <h4 class="text-base font-semibold text-highlighted">
                    {{ team.team.name }}
                  </h4>
                  <p class="mt-1 text-sm text-toned">
                    Locked project: {{ team.submission?.projectName ?? 'Unnamed project' }}
                  </p>
                </div>

                <label class="grid gap-2">
                  <span class="text-sm font-medium text-toned">Operational note</span>
                  <input
                    v-model="getDraft(team).disqualifyReason"
                    type="text"
                    class="w-full rounded-lg border border-black/8 bg-white dark:border-white/[0.08] dark:bg-[#111111] focus:border-black/25 dark:focus:border-white/[0.25] px-4 py-3 text-sm text-highlighted outline-none"
                    placeholder="Competition removal reason"
                  >
                </label>

                <AppButton
                  color="error"
                  variant="soft"
                  :data-testid="`admin-disqualify-submit-${team.team.id}`"
                  :loading="pendingActionKey === `disqualify:${team.team.id}`"
                  :disabled="pendingActionKey !== null && pendingActionKey !== `disqualify:${team.team.id}`"
                  @click="emit('disqualify', {
                    teamId: team.team.id,
                    reason: getDraft(team).disqualifyReason.trim() || undefined
                  })"
                >
                  Disqualify submission
                </AppButton>
              </div>
            </article>
          </div>

          <AppAlert
            v-else
            color="neutral"
            variant="soft"
            title="No disqualification candidates"
            description="No visible teams currently have a locked submission eligible for admin disqualification."
          />
        </section>
      </template>
    </div>
  </AppCard>
</template>

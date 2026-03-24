import { requireAuthNavigationGuard } from '../app/utils/auth-guards'

export default defineNuxtRouteMiddleware(requireAuthNavigationGuard)

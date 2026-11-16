import { createClient } from '@supabase/supabase-js'
import { toWellbeing } from '../format'
import type { DataBackend, Me, Period, TeamSummary } from '../types'

export function createSupabaseBackend(url: string, anonKey: string): DataBackend {
  const sb = createClient(url, anonKey)

  const uid = async () => (await sb.auth.getSession()).data.session?.user.id ?? null
  const fail = (e: { message: string } | null) => {
    if (e) throw new Error(e.message)
  }

  return {
    kind: 'supabase',
    currentUserId: uid,

    async signInWithPassword(email, password) {
      const { error } = await sb.auth.signInWithPassword({ email, password })
      if (error) throw new Error('Email o contraseña incorrectos')
    },

    async signOut() {
      await sb.auth.signOut()
    },

    async getMe(): Promise<Me> {
      const id = await uid()
      const { data, error } = await sb
        .from('profiles')
        .select('id, full_name, role, company:companies(id, name, pause_window_start, pause_window_end)')
        .eq('id', id)
        .single()
      fail(error)
      const c = data!.company as unknown as Record<string, string>
      return {
        id: data!.id,
        fullName: data!.full_name,
        role: data!.role,
        company: { id: c.id, name: c.name, pauseWindowStart: c.pause_window_start, pauseWindowEnd: c.pause_window_end },
      }
    },

    async listTeams(): Promise<TeamSummary[]> {
      const { data, error } = await sb
        .from('teams')
        .select('id, name, manager_id, manager:profiles!teams_manager_id_fkey(full_name), team_members(count)')
        .order('name')
      fail(error)
      return (data ?? []).map((t) => {
        const r = t as unknown as {
          id: string; name: string; manager_id: string | null
          manager: { full_name: string } | null; team_members: { count: number }[]
        }
        return {
          id: r.id,
          name: r.name,
          managerId: r.manager_id,
          managerName: r.manager?.full_name ?? null,
          memberCount: r.team_members[0]?.count ?? 0,
        }
      })
    },

    async teamWellbeing(teamId: string, period: Period, offset: number) {
      const { data, error } = await sb.rpc('team_wellbeing', { p_team_id: teamId, p_period: period, p_offset: offset })
      fail(error)
      return toWellbeing((data as Record<string, unknown>[])[0])
    },

    async companyWellbeing(period: Period, offset: number) {
      const { data, error } = await sb.rpc('company_wellbeing', { p_period: period, p_offset: offset })
      fail(error)
      return toWellbeing((data as Record<string, unknown>[])[0])
    },

    async updatePauseWindow(start, end) {
      const me = await this.getMe()
      const { error } = await sb
        .from('companies')
        .update({ pause_window_start: start, pause_window_end: end })
        .eq('id', me.company.id)
      fail(error)
    },
  }
}

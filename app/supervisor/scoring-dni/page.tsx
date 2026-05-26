"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { ScoringDniPanelUser } from "@/components/scoring/scoring-dni-panel-user"

export default function SupervisorScoringDniPage() {
  return (
    <DashboardLayout requiredRole="supervisor">
      <ScoringDniPanelUser />
    </DashboardLayout>
  )
}

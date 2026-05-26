"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { ScoringDniPanel } from "@/components/scoring/scoring-dni-panel"

export default function AdminScoringDniPage() {
  return (
    <DashboardLayout requiredRole="admin">
      <ScoringDniPanel />
    </DashboardLayout>
  )
}

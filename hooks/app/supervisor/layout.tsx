import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Supervisor - TusVentas",
  description: "Panel de Supervisor",
}

export default function SupervisorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}

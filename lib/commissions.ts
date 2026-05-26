// Esquema de comisiones por ventas activadas del mes
// 1-4 ventas: $200,000 por venta
// 5-9 ventas: $300,000 por venta
// 10-19 ventas: $350,000 por venta
// 20-25 ventas: $375,000 por venta
// 26+ ventas: $400,000 por venta

export function getCommissionPerSale(activatedCount: number): number {
  if (activatedCount >= 26) return 400000
  if (activatedCount >= 20) return 375000
  if (activatedCount >= 10) return 350000
  if (activatedCount >= 5) return 300000
  if (activatedCount >= 1) return 200000
  return 0
}

export function calculateTotalCommission(activatedCount: number): number {
  const commissionPerSale = getCommissionPerSale(activatedCount)
  return activatedCount * commissionPerSale
}

export function getCommissionTier(activatedCount: number): string {
  if (activatedCount >= 26) return "26+ ventas"
  if (activatedCount >= 20) return "20-25 ventas"
  if (activatedCount >= 10) return "10-19 ventas"
  if (activatedCount >= 5) return "5-9 ventas"
  if (activatedCount >= 1) return "1-4 ventas"
  return "Sin ventas"
}

export function isCurrentMonth(dateString: string): boolean {
  const date = new Date(dateString)
  const now = new Date()
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
}

export function getActivatedSalesThisMonth<T extends { status: string; createdAt?: string; updatedAt?: string }>(
  sales: T[]
): T[] {
  return sales.filter(sale => {
    // Solo cuenta ventas "completed" (activadas)
    if (sale.status !== "completed") return false
    const dateToCheck = sale.updatedAt || sale.createdAt
    if (!dateToCheck) return false
    return isCurrentMonth(dateToCheck)
  })
}

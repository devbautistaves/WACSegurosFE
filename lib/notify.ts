// Stub: push notifications desactivadas en la demo

interface NotifySaleStatusData {
  saleId: string
  sellerId: string
  customerName: string
  newStatus: string
}

interface NotifyNewSaleData {
  saleId: string
  sellerName: string
  customerName: string
  planName: string
}

interface NotifyAnnouncementData {
  title: string
  message: string
  recipientType: 'all' | 'selected'
  recipients?: string[]
}

// No-ops en demo (sin push notifications)
export async function notifySaleStatusChanged(_data: NotifySaleStatusData): Promise<void> {}
export async function notifyNewSale(_data: NotifyNewSaleData): Promise<void> {}
export async function notifyAnnouncement(_data: NotifyAnnouncementData): Promise<void> {}

const statusLabels: Record<string, string> = {
  pending: 'Cargada',
  pending_signature: 'Pendiente Firma',
  pending_appointment: 'Pendiente Turno',
  appointed: 'Turnada',
  completed: 'Instalada',
  cancelled: 'Cancelada',
  // Empresa 2 (paginas)
  demo_pendiente: 'Demo Pendiente',
  demo_enviada: 'Demo Enviada',
  web_activada: 'Web Activada',
  web_pausada: 'Web Pausada',
  cliente_baja: 'Cliente Baja',
  // Seguros
  vigente: 'Vigente',
  pendiente_pago: 'Pendiente de Pago',
  en_mora: 'En Mora',
  renovacion: 'En Renovacion',
  anulada: 'Anulada',
}

export function getStatusLabel(status: string): string {
  return statusLabels[status] || status
}

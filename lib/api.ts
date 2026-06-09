// WAC Seguros — siempre usa el proxy interno de Next.js
// El proxy (app/api/proxy/route.ts) apunta a vps.../wacseguros
const API_URL = "/api/proxy"

interface FetchOptions extends RequestInit {
  token?: string
  companyId?: string
}

// WAC Seguros — siempre "seguros"
function getStoredCompanyId(): string {
  return "seguros"
}

// __FETCHAPI_REFRESH_V2__
// Coalescing global del refresh: si dos requests fallan a la vez, hacemos
// UN solo POST /auth/refresh y los dos reintentan con el token nuevo.
let _inflightRefresh: Promise<string | null> | null = null

async function tryRefreshToken(): Promise<string | null> {
  if (typeof window === "undefined") return null
  if (_inflightRefresh) return _inflightRefresh
  _inflightRefresh = (async () => {
    try {
      const r = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",   // necesario para que la cookie httpOnly `rt` viaje
        headers: { "Content-Type": "application/json", "X-Company-ID": getStoredCompanyId() },
      })
      if (!r.ok) return null
      const d = await r.json().catch(() => null)
      if (!d?.success || !d?.token) return null
      localStorage.setItem("token", d.token)
      if (d.user) localStorage.setItem("user", JSON.stringify(d.user))
      return d.token as string
    } catch {
      return null
    } finally {
      // liberar slot luego de que terminen de leerlo los await en cola
      setTimeout(() => { _inflightRefresh = null }, 50)
    }
  })()
  return _inflightRefresh
}

function forceLogoutToLogin() {
  if (typeof window === "undefined") return
  localStorage.removeItem("token")
  localStorage.removeItem("user")
  window.location.href = "/login"
}

async function fetchAPI<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { token, companyId, ...fetchOptions } = options

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Company-ID": companyId || getStoredCompanyId(),
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  // If using proxy, strip /api prefix since proxy adds it back
  let url: string
  if (API_URL === "/api/proxy") {
    const proxyPath = endpoint.replace(/^\/api\//, "")
    url = `${API_URL}/${proxyPath}`
  } else {
    url = `${API_URL}${endpoint}`
  }

  // credentials:include permite que la cookie `rt` viaje al backend
  // (vía el proxy que ahora la reenvía).
  const doFetch = (extraHeaders: Record<string, string> = {}) =>
    fetch(url, { ...fetchOptions, credentials: "include", headers: { ...headers, ...extraHeaders } })

  let response = await doFetch()
  let responseText = await response.text()

  let data: any
  try {
    data = JSON.parse(responseText)
  } catch {
    data = { success: false, message: responseText || "Error de conexion" }
  }

  // Token expirado → intentar refresh transparente y reintentar UNA vez
  const isExpired =
    response.status === 401 &&
    (data?.expired === true || data?.code === "TOKEN_EXPIRED")
  // No reintentar el propio refresh (evita loop) ni si el caller pidió evitarlo
  const skipRefresh = endpoint.includes("/auth/refresh") || (fetchOptions as any)._retried === true

  if (isExpired && !skipRefresh) {
    const newToken = await tryRefreshToken()
    if (newToken) {
      response = await doFetch({ Authorization: `Bearer ${newToken}` })
      responseText = await response.text()
      try { data = JSON.parse(responseText) } catch { data = { success: false, message: responseText } }
    } else {
      // El refresh falló (cookie ausente, refresh token vencido, etc) → logout
      forceLogoutToLogin()
      throw new Error("Sesión expirada — iniciá sesión de nuevo")
    }
  }

  if (!response.ok) {
    // 401 sin expired: token corrupto / sin auth → login limpio
    if (response.status === 401) {
      forceLogoutToLogin()
    }
    throw new Error(data.message || data.error || `Error ${response.status}`)
  }

  return data as T
}


// Auth
export const authAPI = {
  login: (email: string, password: string) =>
    fetchAPI<{ success: boolean; token: string; user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  register: (data: RegisterData) =>
    fetchAPI<{ success: boolean; token: string; user: User }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),
}

// Users
export const usersAPI = {
  getProfile: (token: string) =>
    fetchAPI<{ success: boolean; user: User }>("/api/users/profile", { token }),

  updateProfile: (token: string, data: Partial<User>) =>
    fetchAPI<{ success: boolean; user: User }>("/api/users/profile", {
      method: "PUT",
      token,
      body: JSON.stringify(data),
    }),

  getAll: (token: string) =>
    fetchAPI<{ success: boolean; users: User[] }>("/api/admin/users", { token }),

  create: (token: string, data: CreateUserData) =>
    fetchAPI<{ success: boolean; user: User }>("/api/admin/users", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  update: (token: string, id: string, data: Partial<User>) =>
    fetchAPI<{ success: boolean; user: User }>(`/api/admin/users/${id}`, {
      method: "PUT",
      token,
      body: JSON.stringify(data),
    }),

  delete: (token: string, id: string) =>
    fetchAPI<{ success: boolean }>(`/api/admin/users/${id}`, {
      method: "DELETE",
      token,
    }),

  // Para supervisores: obtener lista de vendedores
  getSellers: (token: string) =>
    fetchAPI<{ success: boolean; sellers: User[] }>("/api/sellers", { token }),

  // Para vendedores: obtener lista de supervisores
  getSupervisors: (token: string) =>
    fetchAPI<{ success: boolean; supervisors: User[] }>("/api/supervisors", { token }),
}

// Alias for convenience
export const userAPI = usersAPI

// Sales
export const salesAPI = {
  getAll: (token: string) =>
    fetchAPI<{ success: boolean; sales: Sale[] }>("/api/sales", { token }),

  getMySales: (token: string) =>
    fetchAPI<{ success: boolean; sales: Sale[] }>("/api/sales", { token }),

  create: (token: string, data: CreateSaleData) =>
    fetchAPI<{ success: boolean; sale: Sale }>("/api/sales", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  updateStatus: (token: string, id: string, status: string, notes?: string, statusDate?: string, ctoNumber?: string, appointmentSlot?: string) =>
    fetchAPI<{ success: boolean; sale: Sale }>(`/api/admin/sales/${id}/status`, {
      method: "PUT",
      token,
      body: JSON.stringify({ status, notes, statusDate, ctoNumber, appointmentSlot }),
    }),

  getAdminSales: (token: string) =>
    fetchAPI<{ success: boolean; sales: Sale[] }>("/api/admin/sales?limit=500", { token }),

  updateCosts: (token: string, id: string, costs: { installationCost?: number; adminCost?: number; adCost?: number; sellerCommissionPaid?: number }) =>
    fetchAPI<{ success: boolean; sale: Sale }>(`/api/admin/sales/${id}/costs`, {
      method: "PUT",
      token,
      body: JSON.stringify(costs),
    }),

  assignSeller: (token: string, id: string, sellerId: string) =>
    fetchAPI<{ success: boolean; sale: Sale }>(`/api/sales/${id}/assign`, {
      method: "PUT",
      token,
      body: JSON.stringify({ sellerId }),
    }),

  update: (token: string, id: string, data: Partial<Sale>) =>
    fetchAPI<{ success: boolean; sale: Sale }>(`/api/admin/sales/${id}`, {
      method: "PUT",
      token,
      body: JSON.stringify(data),
    }),
  
  updateContract: (token: string, id: string, contractNumber: string) =>
    fetchAPI<{ success: boolean; sale: Sale }>(`/api/admin/sales/${id}/contract`, {
      method: "PUT",
      token,
      body: JSON.stringify({ contractNumber }),
    }),

  // Marcar venta como baja (usa el endpoint de update general)
  markAsBaja: (token: string, id: string, bajaData: { bajaDate: string; bajaMonthsLimit: number; bajaReason?: string; bajaAmount?: number }) =>
    fetchAPI<{ success: boolean; sale: Sale }>(`/api/admin/sales/${id}`, {
      method: "PUT",
      token,
      body: JSON.stringify({ ...bajaData, isBaja: true }),
    }),

  // Quitar estado de baja
  removeBaja: (token: string, id: string) =>
    fetchAPI<{ success: boolean; sale: Sale }>(`/api/admin/sales/${id}`, {
      method: "PUT",
      token,
      body: JSON.stringify({ isBaja: false, bajaDate: null, bajaMonthsLimit: null, bajaReason: null, bajaAmount: null }),
    }),

  // Subir archivo adjunto de instalacion
  uploadAttachment: async (token: string, saleId: string, file: File) => {
    const formData = new FormData()
    formData.append("file", file)
    
    const response = await fetch(`${API_URL}/api/sales/${saleId}/attachments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Error uploading file")
    }
    
    return response.json() as Promise<{ success: boolean; attachment: InstallationAttachment; sale: Sale }>
  },

  // Eliminar archivo adjunto
  deleteAttachment: (token: string, saleId: string, attachmentId: string) =>
    fetchAPI<{ success: boolean; sale: Sale }>(`/api/sales/${saleId}/attachments/${attachmentId}`, {
      method: "DELETE",
      token,
    }),
}

// Plans
export const plansAPI = {
  getAll: (token: string) =>
    fetchAPI<{ success: boolean; plans: Plan[] }>("/api/plans", { token }),

  create: (token: string, data: CreatePlanData) =>
    fetchAPI<{ success: boolean; plan: Plan }>("/api/admin/plans", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  update: (token: string, id: string, data: Partial<Plan>) =>
    fetchAPI<{ success: boolean; plan: Plan }>(`/api/admin/plans/${id}`, {
      method: "PUT",
      token,
      body: JSON.stringify(data),
    }),

  delete: (token: string, id: string) =>
    fetchAPI<{ success: boolean }>(`/api/admin/plans/${id}`, {
      method: "DELETE",
      token,
    }),
}

// Dashboard
export const dashboardAPI = {
  getStats: (token: string) =>
    fetchAPI<DashboardStats>("/api/dashboard/stats", { token }),

  getAdminStats: (token: string) =>
    fetchAPI<AdminStats>("/api/admin/stats", { token }),
}

// Support - endpoints que permiten acceso tipo admin para rol support
// El backend debe configurar estos endpoints para aceptar rol "support" ademas de "admin"
export const supportAPI = {
  // Obtener todas las ventas - usa endpoint admin con token de support
  getSales: async (token: string): Promise<{ success: boolean; sales: Sale[] }> => {
    const companyId = getStoredCompanyId()
    const response = await fetch(`${API_URL}/api/admin/sales?limit=500`, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "X-Company-ID": companyId
      }
    })
    if (!response.ok) {
      console.error("Support getSales failed:", response.status)
      throw new Error("Error al obtener ventas")
    }
    return response.json()
  },

  // Obtener usuarios - usa endpoint admin con token de support
  getUsers: async (token: string): Promise<{ success: boolean; users: User[] }> => {
    const companyId = getStoredCompanyId()
    const response = await fetch(`${API_URL}/api/admin/users`, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "X-Company-ID": companyId
      }
    })
    if (!response.ok) {
      console.error("Support getUsers failed:", response.status)
      return { success: true, users: [] }
    }
    return response.json()
  },

  // Obtener planes - usa endpoint general /api/plans
  getPlans: async (token: string): Promise<{ success: boolean; plans: Plan[] }> => {
    const companyId = getStoredCompanyId()
    const response = await fetch(`${API_URL}/api/plans`, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "X-Company-ID": companyId
      }
    })
    if (!response.ok) {
      console.error("Support getPlans failed:", response.status)
      return { success: true, plans: [] }
    }
    return response.json()
  },

  // Actualizar estado de venta - usa endpoint admin
  updateSaleStatus: async (token: string, id: string, status: string, notes?: string, statusDate?: string, ctoNumber?: string, appointmentSlot?: string) => {
    const response = await fetch(`${API_URL}/api/admin/sales/${id}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ status, notes, statusDate, ctoNumber, appointmentSlot }),
    })
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Error al actualizar estado" }))
      throw new Error(error.message || "Error al actualizar estado")
    }
    return response.json()
  },

  // Actualizar costos de venta - usa endpoint admin
  updateSaleCosts: async (token: string, id: string, costs: { installationCost?: number; adminCost?: number; adCost?: number; sellerCommissionPaid?: number }) => {
    const response = await fetch(`${API_URL}/api/admin/sales/${id}/costs`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(costs),
    })
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Error al actualizar costos" }))
      throw new Error(error.message || "Error al actualizar costos")
    }
    return response.json()
  },

  // Asignar vendedor - usa endpoint admin
  assignSeller: async (token: string, id: string, sellerId: string) => {
    const response = await fetch(`${API_URL}/api/admin/sales/${id}/assign`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ sellerId }),
    })
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Error al asignar vendedor" }))
      throw new Error(error.message || "Error al asignar vendedor")
    }
    return response.json()
  },

  // Crear venta - usa endpoint admin
  createSale: async (token: string, data: CreateSaleData) => {
    const response = await fetch(`${API_URL}/api/admin/sales`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Error al crear venta" }))
      throw new Error(error.message || "Error al crear venta")
    }
    return response.json()
  },

  // Dashboard stats para support - usa endpoint admin
  getStats: async (token: string) => {
    const companyId = getStoredCompanyId()
    const response = await fetch(`${API_URL}/api/admin/stats`, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "X-Company-ID": companyId
      }
    })
    if (!response.ok) {
      throw new Error("Error al obtener estadisticas")
    }
    return response.json()
  },
}

// Company Settings
export const companySettingsAPI = {
  get: (token: string, companyId: string) =>
    fetchAPI<{ success: boolean; settings: CompanySettingsData }>(`/api/company-settings/${companyId}`, { token }),

  update: (token: string, companyId: string, data: Partial<CompanySettingsData>) =>
    fetchAPI<{ success: boolean; message: string; settings: CompanySettingsData }>(`/api/company-settings/${companyId}`, {
      method: "PUT",
      token,
      body: JSON.stringify(data),
    }),
}

export interface CommissionScale {
  minSales: number
  maxSales: number | null
  commissionAmount: number
}

export interface CompanySettingsData {
  _id?: string
  companyId: "prosegur" | "tupaginaya"
  baseCommissionPerSale: number
  basePrice?: number // Para TuPaginaYa
  commissionScales?: CommissionScale[] // Escalas de comisiones para vendedores
  supervisorFixedCommission?: number // Comision fija para supervisores por venta
  settings?: Record<string, unknown>
  createdAt?: string
  updatedAt?: string
}

// Notifications
export const notificationsAPI = {
  getAll: (token: string) =>
    fetchAPI<{ success: boolean; notifications: Notification[] }>("/api/notifications", { token }),

  getUnreadCount: (token: string) =>
    fetchAPI<{ success: boolean; count: number }>("/api/notifications/unread-count", { token }),

  markAsRead: (token: string, id: string) =>
    fetchAPI<{ success: boolean }>(`/api/notifications/${id}/read`, {
      method: "PUT",
      token,
    }),

  markAllAsRead: (token: string) =>
    fetchAPI<{ success: boolean }>("/api/notifications/mark-all-read", {
      method: "PUT",
      token,
    }),
}

// Announcements (Admin) - Uses multipart/form-data for file uploads
export const announcementsAPI = {
  // GET /api/admin/announcements — historial de anuncios creados
  getAdminHistory: (token: string) =>
    fetchAPI<{ success: boolean; notifications: Notification[] }>("/api/admin/announcements", { token }),

  // DELETE /api/notifications/:id
  delete: (token: string, id: string) =>
    fetchAPI<{ success: boolean }>(`/api/notifications/${id}`, { method: "DELETE", token }),

  // DELETE /api/notifications/bulk — { ids: string[] }
  deleteMany: (token: string, ids: string[]) =>
    fetchAPI<{ success: boolean; deleted: number }>("/api/notifications/bulk", {
      method: "DELETE",
      token,
      body: JSON.stringify({ ids }),
    }),

  create: async (token: string, data: CreateAnnouncementData, files?: File[]) => {
    const formData = new FormData()
    formData.append("title", data.title)
    formData.append("message", data.message)
    formData.append("type", data.type || "info")
    formData.append("priority", data.priority || "medium")
    formData.append("recipientType", data.recipientType || "all")
    
    if (data.recipients && data.recipients.length > 0) {
      formData.append("recipients", JSON.stringify(data.recipients))
    }
    
    if (data.meetingInfo) {
      formData.append("meetingInfo", JSON.stringify(data.meetingInfo))
    }
    
    if (files && files.length > 0) {
      files.forEach((file) => {
        formData.append("attachments", file)
      })
    }

    // IMPORTANTE: Incluir X-Company-ID para que se guarde y envie a la empresa correcta
    const companyId = getStoredCompanyId()
    
    const response = await fetch(`${API_URL}/api/notifications`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Company-ID": companyId,
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Error de conexion" }))
      throw new Error(error.message || error.error || "Error en la solicitud")
    }

    return response.json()
  },
}

export interface CreateAnnouncementData {
  title: string
  message: string
  type?: "info" | "warning" | "success" | "meeting" | "material"
  priority?: "low" | "medium" | "high" | "urgent"
  recipientType?: "all" | "selected"
  recipients?: string[]
  meetingInfo?: {
    date: string
    time: string
    link?: string
    location?: string
  }
}

// Supervisor Ad Costs
export const adCostsAPI = {
  // Admin: obtener todos los costos de anuncio
  getAll: (token: string, month?: string, supervisorId?: string) => {
    const params = new URLSearchParams()
    if (month) params.append("month", month)
    if (supervisorId) params.append("supervisorId", supervisorId)
    const queryString = params.toString() ? `?${params.toString()}` : ""
    return fetchAPI<{ success: boolean; adCosts: SupervisorAdCost[] }>(`/api/admin/ad-costs${queryString}`, { token })
  },

  // Admin: crear o actualizar costo de anuncio
  upsert: (token: string, data: { supervisorId: string; amount: number; month: string; notes?: string }) =>
    fetchAPI<{ success: boolean; adCost: SupervisorAdCost; message: string }>("/api/admin/ad-costs", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  // Admin: eliminar costo de anuncio
  delete: (token: string, id: string) =>
    fetchAPI<{ success: boolean }>(`/api/admin/ad-costs/${id}`, {
      method: "DELETE",
      token,
    }),

  // Supervisor: obtener mis costos de anuncio
  getMyCosts: (token: string, month?: string) => {
    const queryString = month ? `?month=${month}` : ""
    return fetchAPI<{ success: boolean; adCosts: SupervisorAdCost[] }>(`/api/ad-costs/my${queryString}`, { token })
  },
}

// Chat
export const chatAPI = {
  getRooms: (token: string) =>
    fetchAPI<{ success: boolean; rooms: ChatRoom[] }>("/api/chat/rooms", { token }),

  getGroupChat: (token: string) =>
    fetchAPI<{ success: boolean; chatRoom: ChatRoom }>("/api/chat/group", { token }),

  getPrivateAdminChat: (token: string) =>
    fetchAPI<{ success: boolean; chatRoom: ChatRoom }>("/api/chat/private-admin", { token }),

  getPrivateChats: (token: string) =>
    fetchAPI<{ success: boolean; chatRooms: ChatRoom[] }>("/api/chat/private-chats", { token }),

  getMessages: (token: string, roomId: string) =>
    fetchAPI<{ success: boolean; messages: ChatMessage[] }>(`/api/chat/${roomId}/messages`, { token }),

  sendMessage: (token: string, roomId: string, content: string) =>
    fetchAPI<{ success: boolean; data: ChatMessage }>(`/api/chat/${roomId}/messages`, {
      method: "POST",
      token,
      body: JSON.stringify({ content }),
    }),

  getPrivateChat: (token: string, userId: string) =>
    fetchAPI<{ success: boolean; room: ChatRoom }>(`/api/chat/private/${userId}`, { token }),
}

// Leads API - Sistema de embudo de ventas
export const leadsAPI = {
  // Obtener todos los leads (admin/supervisor)
  getAll: (token: string, filters?: { status?: string; assignedTo?: string; source?: string; month?: string }) => {
    const params = new URLSearchParams()
    if (filters?.status) params.append("status", filters.status)
    if (filters?.assignedTo) params.append("assignedTo", filters.assignedTo)
    if (filters?.source) params.append("source", filters.source)
    if (filters?.month) params.append("month", filters.month)
    const query = params.toString() ? `?${params.toString()}` : ""
    return fetchAPI<{ success: boolean; leads: Lead[] }>(`/api/leads${query}`, { token })
  },

  // Obtener leads asignados al vendedor actual
  getMyLeads: (token: string, filters?: { status?: string; source?: string }) => {
    const params = new URLSearchParams()
    if (filters?.status) params.append("status", filters.status)
    if (filters?.source) params.append("source", filters.source)
    const query = params.toString() ? `?${params.toString()}` : ""
    return fetchAPI<{ success: boolean; leads: Lead[] }>(`/api/leads/my${query}`, { token })
  },

  // Obtener un lead por ID
  getById: (token: string, id: string) =>
    fetchAPI<{ success: boolean; lead: Lead }>(`/api/leads/${id}`, { token }),

  // Crear un nuevo lead (admin/supervisor)
  create: (token: string, data: CreateLeadData) =>
    fetchAPI<{ success: boolean; message: string; lead: Lead }>("/api/leads", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  // Actualizar un lead (admin/supervisor)
  update: (token: string, id: string, data: Partial<CreateLeadData> & { status?: LeadStatus; nextFollowUp?: string }) =>
    fetchAPI<{ success: boolean; message: string; lead: Lead }>(`/api/leads/${id}`, {
      method: "PUT",
      token,
      body: JSON.stringify(data),
    }),

  // Agregar interaccion/contacto al historial
  addContact: (token: string, id: string, data: AddLeadContactData) =>
    fetchAPI<{ success: boolean; message: string; lead: Lead }>(`/api/leads/${id}/contact`, {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  // Actualizar estado del lead
  updateStatus: (token: string, id: string, status: LeadStatus, notes?: string) =>
    fetchAPI<{ success: boolean; message: string; lead: Lead }>(`/api/leads/${id}/status`, {
      method: "PUT",
      token,
      body: JSON.stringify({ status, notes }),
    }),

  // Obtener datos para conversion a venta
  getConversionData: (token: string, id: string) =>
    fetchAPI<{
      success: boolean
      message: string
      leadData: {
        leadId: string
        sellerId: string
        customerInfo: {
          name: string
          phone: string
          email: string
          dni: string
          address: Record<string, string>
        }
        interestedPlanId?: string
        interestedPlanName?: string
      }
    }>(`/api/leads/${id}/convert`, { method: "POST", token }),

  // Marcar lead como convertido
  markConverted: (token: string, id: string, saleId: string) =>
    fetchAPI<{ success: boolean; message: string; lead: Lead }>(`/api/leads/${id}/mark-converted`, {
      method: "PUT",
      token,
      body: JSON.stringify({ saleId }),
    }),

  // Eliminar lead (solo admin)
  delete: (token: string, id: string) =>
    fetchAPI<{ success: boolean; message: string }>(`/api/leads/${id}`, {
      method: "DELETE",
      token,
    }),

  // Obtener estadisticas de leads
  getStats: (token: string, filters?: { month?: string; assignedTo?: string }) => {
    const params = new URLSearchParams()
    if (filters?.month) params.append("month", filters.month)
    if (filters?.assignedTo) params.append("assignedTo", filters.assignedTo)
    const query = params.toString() ? `?${params.toString()}` : ""
    return fetchAPI<{
      success: boolean
      stats: {
        total: number
        byStatus: Record<string, number>
        conversionRate: number
      }
    }>(`/api/leads/stats/summary${query}`, { token })
  },
}

// Types
export interface User {
  _id: string
  companyId?: "prosegur" | "tupaginaya"
  allowedCompanies?: ("prosegur" | "tupaginaya")[] // Empresas adicionales a las que puede acceder
  name: string
  email: string
  phone: string
  location: string
  role: "seller" | "admin" | "supervisor" | "support"
  commissionRate: number
  supervisorBaseCommission?: number
  fixedCommissionPerSale?: number | null
  supervisorId?: string | null
  isActive: boolean
  totalSales: number
  totalCommissions: number
  createdAt: string
  updatedAt: string
}

export interface Notification {
  _id: string
  companyId: "prosegur" | "tupaginaya"
  title: string
  message: string
  type: "info" | "warning" | "success" | "meeting" | "material" | "document" | "announcement" | "training"
  priority: "low" | "medium" | "high" | "urgent"
  recipientType: "all" | "selected"
  recipients: string[]
  meetingInfo?: {
    date?: string
    time?: string
    link?: string
    location?: string
  }
  attachments?: {
    filename: string
    url: string
    type: string
  }[]
  readBy: {
    userId: string
    readAt: string
  }[]
  isRead?: boolean
  createdBy: { _id: string; name: string } | string
  emailsSent: boolean
  emailSentCount: number
  createdAt: string
  updatedAt: string
}

export interface RegisterData {
  name: string
  email: string
  password: string
  phone: string
  location: string
}

export interface CreateUserData {
  companyId: "prosegur" | "tupaginaya"
  name: string
  email: string
  password: string
  phone: string
  location: string
  role: "seller" | "admin" | "supervisor" | "support"
}

export interface Sale {
  _id: string
  sellerId: string | { _id: string; name?: string; email?: string }
  supervisorId?: string | { _id: string; name?: string; email?: string }
  sellerName: string
  planId: string
  planName: string
  planPrice: number
  customPrice?: number
  commission: number
  commissionRate: number
  description: string
  planDetail?: string
  status: "pending" | "pending_signature" | "pending_appointment" | "observed" | "appointed" | "completed" | "cancelled"
  statusHistory: StatusHistoryItem[]
  customerInfo: CustomerInfo
  paymentInfo?: PaymentInfo
  // Campos de costos para supervisor
  installationCost?: number
  adminCost?: number
  adCost?: number
  sellerCommissionPaid?: number
  // Fechas de estados para corte mensual
  appointedDate?: string
  appointmentSlot?: "AM" | "PM"
  completedDate?: string
  installationCostDate?: string
  // Numero de CTO para ventas activadas
  ctoNumber?: string
  // Numero de contrato
  contractNumber?: string
  // Campos para bajas
  isBaja?: boolean
  bajaDate?: string
  bajaMonthsLimit?: number // Meses antes de los cuales se considera baja con descuento (ej: 6 meses)
  bajaReason?: string
  bajaAmount?: number // Importe personalizado a descontar del neto
  // Archivos adjuntos de instalacion
  installationAttachments?: InstallationAttachment[]
  createdAt: string
  updatedAt: string
}

export interface InstallationAttachment {
  _id?: string
  filename: string
  originalName: string
  mimetype: string
  size: number
  url: string
  uploadedAt: string
  uploadedBy: string
}

export interface PaymentInfo {
  paymentMethodAbono: "credit_card" | "cbu"
  cardBrand?: "visa" | "mastercard"
  cbuNumber?: string
  paymentMethodInstallation: "transfer" | "mercadopago"
}

export interface StatusHistoryItem {
  status: string
  changedBy: string
  changedAt: string
  notes?: string
}

export interface CustomerInfo {
  name: string
  email: string
  phone: string
  dni: string
  birthDate?: string
  address: {
    street: string
    number: string
    floor?: string
    apartment?: string
    city: string
    province: string
    postalCode: string
    entreCalles?: string
    googleMapsLink?: string
  }
  emergencyContact?: {
    name: string
    phone: string
  }
}

export interface CreateSaleData {
  planId: string
  description: string
  planDetail?: string
  customPrice?: number
  customerInfo: CustomerInfo
  paymentInfo?: PaymentInfo
  sellerId?: string // Para que admin/supervisor asigne a un vendedor
}

export interface Plan {
  _id: string
  name: string
  description: string
  price: number
  features: string[]
  isActive: boolean
  createdAt: string
}

export interface CreatePlanData {
  name: string
  description: string
  price: number
  features: string[]
}

export interface DashboardStats {
  success: boolean
  stats: {
    totalSales: number
    completedSales: number
    pendingSales: number
    cancelledSales: number
    totalCommissions: number
    monthlySales: number
  }
}

export interface AdminStats {
  success: boolean
  stats: {
    totalSales: number
    totalRevenue: number
    totalCommissions: number
    totalUsers: number
    salesByStatus: Record<string, number>
    topSellers: Array<{
      _id: string
      name: string
      totalSales: number
      totalCommissions: number
    }>
  }
}

export interface Notification {
  _id: string
  userId: string
  title: string
  message: string
  type: "status_change" | "new_sale" | "general"
  isRead: boolean
  saleId?: string
  createdAt: string
}

export interface ChatRoom {
  _id: string
  name: string
  type: "group" | "private"
  participants: string[]
  createdAt: string
  updatedAt: string
}

export interface ChatMessage {
  _id: string
  roomId?: string
  chatRoom?: string
  senderId?: string
  sender?: {
    _id: string
    name: string
    role: string
  }
  senderName?: string
  content: string
  attachments?: string[]
  createdAt: string
}

export interface SupervisorAdCost {
  _id: string
  supervisorId: string | { _id: string; name: string; email: string }
  amount: number
  month: string
  notes?: string
  createdBy?: string | { _id: string; name: string }
  updatedBy?: string | { _id: string; name: string }
  createdAt: string
  updatedAt: string
}

// Lead types
export type LeadStatus = "nuevo" | "contactado" | "interesado" | "no_contesta" | "no_interesado" | "seguimiento" | "cerrado_ganado" | "cerrado_perdido"
export type LeadSource = "facebook" | "instagram" | "google" | "referido" | "llamada_entrante" | "puerta_a_puerta" | "otro"
export type LeadPriority = "baja" | "media" | "alta" | "urgente"
export type ContactType = "llamada" | "whatsapp" | "email" | "visita" | "otro"
export type ContactOutcome = "contactado" | "no_contesta" | "interesado" | "no_interesado" | "agendar_seguimiento" | "cerrar"

export interface LeadContact {
  _id?: string
  type: ContactType
  date: string
  notes?: string
  outcome: ContactOutcome
  nextAction?: string
  nextActionDate?: string
  recordedBy?: string | { _id: string; name: string }
}

export interface Lead {
  _id: string
  name: string
  phone: string
  email?: string
  dni?: string
  address?: {
    street?: string
    number?: string
    city?: string
    province?: string
    postalCode?: string
  }
  source: LeadSource
  sourceDetail?: string
  assignedTo: string | { _id: string; name: string; email?: string; phone?: string }
  assignedBy: string | { _id: string; name: string }
  assignedAt: string
  status: LeadStatus
  priority: LeadPriority
  interestedPlanId?: string | { _id: string; name: string; price: number }
  interestedPlanName?: string
  contactHistory: LeadContact[]
  nextFollowUp?: string
  notes?: string
  convertedToSaleId?: string
  convertedAt?: string
  createdAt: string
  updatedAt: string
}

export interface CreateLeadData {
  name: string
  phone: string
  email?: string
  dni?: string
  address?: {
    street?: string
    number?: string
    city?: string
    province?: string
    postalCode?: string
  }
  source?: LeadSource
  sourceDetail?: string
  assignedTo: string
  priority?: LeadPriority
  interestedPlanId?: string
  notes?: string
}

export interface AddLeadContactData {
  type: ContactType
  notes?: string
  outcome: ContactOutcome
  nextAction?: string
  nextActionDate?: string
}

// ========================================
// TUPAGINAYA - Tipos e Interfaces
// ========================================

export type ClientStatus = "demo_pendiente" | "demo_enviada" | "demo_pausada" | "web_pendiente" | "web_activada" | "web_pausada" | "cliente_baja"
export type WebType = "landing" | "ecommerce" | "catalogo" | "institucional" | "blog" | "otro"
export type PaymentMethod = "efectivo" | "transferencia" | "mercadopago" | "tarjeta" | "otro"
export type PaymentStatus = "pendiente" | "pagado" | "vencido" | "anulado"
export type TransactionType = "ingreso" | "egreso"
export type LiquidationStatus = "pendiente" | "pagado" | "anulado"

export interface SocialNetworks {
  instagram?: string
  facebook?: string
  tiktok?: string
  website?: string
  other?: string
}

export interface Client {
  _id: string
  companyId: string
  name: string
  email?: string
  phone?: string
  whatsapp?: string
  dni?: string
  // Datos del negocio
  businessName: string
  businessType?: string
  whatTheySell?: string
  // Redes sociales y archivos
  socialNetworks?: SocialNetworks
  flyerUrl?: string
  logoUrl?: string
  // Datos de la web
  domain?: string
  demoUrl?: string
  liveUrl?: string
  webType: WebType
  hostingPlan?: string
  // Comprobante de pago
  paymentProofUrl?: string
  // Estado
  status: ClientStatus
  activationDate?: string
  cancellationDate?: string
  cancellationReason?: string
  // Precios
  monthlyPrice: number
  setupPrice: number
  billingDay: number
  // Relaciones
  sellerId?: string | { _id: string; name: string; email?: string }
  saleId?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

// Datos para crear una demo
export interface CreateDemoData {
  name: string
  phone?: string
  businessName: string
  businessType?: string
  whatTheySell?: string
  socialNetworks?: SocialNetworks
  flyerUrl?: string
  logoUrl?: string
  notes?: string
}

// Datos para convertir demo a venta
export interface ConvertDemoData {
  name?: string
  email: string
  whatsapp: string
  domain: string
  monthlyPrice: number
  setupPrice: number
  paymentProofUrl?: string
  activateNow?: boolean
}

// Datos completos para crear un cliente
export interface CreateClientData {
  name: string
  email?: string
  phone?: string
  whatsapp?: string
  dni?: string
  businessName: string
  businessType?: string
  whatTheySell?: string
  socialNetworks?: SocialNetworks
  flyerUrl?: string
  logoUrl?: string
  domain?: string
  demoUrl?: string
  webType?: WebType
  hostingPlan?: string
  monthlyPrice?: number
  setupPrice?: number
  billingDay?: number
  paymentProofUrl?: string
  sellerId?: string
  notes?: string
}

// Estadisticas de clientes
export interface ClientStats {
  total: number
  demoPendiente: number
  demoEnviada: number
  webPendiente: number
  webActivada: number
  webPausada: number
  clienteBaja: number
  setupsThisMonth: number
  setupsCount: number
  mrr: number
}

export interface Payment {
  _id: string
  companyId: string
  clientId: string | Client
  amount: number
  period: string
  paymentDate: string
  paymentMethod: PaymentMethod
  status: PaymentStatus
  notes?: string
  recordedBy?: string | { _id: string; name: string }
  createdAt: string
}

export interface Transaction {
  _id: string
  companyId: string
  type: TransactionType
  category: string
  amount: number
  description: string
  date: string
  clientId?: string | { _id: string; name: string; businessName?: string }
  paymentId?: string
  recordedBy: string | { _id: string; name: string }
  notes?: string
  createdAt: string
}

export interface Liquidation {
  _id: string
  companyId: string
  userId: string | { _id: string; name: string; email?: string }
  period: string
  totalAmount: number
  details: Array<{
    saleId?: string
    amount: number
    description: string
  }>
  status: LiquidationStatus
  paidAt?: string
  paidBy?: string | { _id: string; name: string }
  paymentMethod?: PaymentMethod
  notes?: string
  createdBy: string | { _id: string; name: string }
  createdAt: string
}

export interface CollectionItem {
  client: Client
  daysOverdue: number
  lastBillingDate: string
  amountDue: number
}

// ========================================
// TUPAGINAYA - APIs
// ========================================

// Clients API
export const clientsAPI = {
  getAll: (token: string, filters?: { status?: string; sellerId?: string }) => {
    const params = new URLSearchParams()
    if (filters?.status) params.append("status", filters.status)
    if (filters?.sellerId) params.append("sellerId", filters.sellerId)
    const query = params.toString() ? `?${params.toString()}` : ""
    return fetchAPI<{ success: boolean; clients: Client[] }>(`/api/clients${query}`, { token })
  },

  // Obtener clientes asignados al vendedor actual
  getMyClients: (token: string, filters?: { status?: string }) => {
    const params = new URLSearchParams()
    if (filters?.status) params.append("status", filters.status)
    const query = params.toString() ? `?${params.toString()}` : ""
    return fetchAPI<{ success: boolean; clients: Client[] }>(`/api/clients/my${query}`, { token })
  },

  getById: (token: string, id: string) =>
    fetchAPI<{ success: boolean; client: Client }>(`/api/clients/${id}`, { token }),

  // Crear una nueva demo
  createDemo: (token: string, data: CreateDemoData) =>
    fetchAPI<{ success: boolean; client: Client }>("/api/clients/demo", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  create: (token: string, data: CreateClientData) =>
    fetchAPI<{ success: boolean; client: Client }>("/api/clients", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  update: (token: string, id: string, data: Partial<Client>) =>
    fetchAPI<{ success: boolean; client: Client }>(`/api/clients/${id}`, {
      method: "PUT",
      token,
      body: JSON.stringify(data),
    }),

  // Cambiar estado del cliente
  updateStatus: (token: string, id: string, status: ClientStatus) =>
    fetchAPI<{ success: boolean; client: Client }>(`/api/clients/${id}/status`, {
      method: "PUT",
      token,
      body: JSON.stringify({ status }),
    }),

  // Convertir demo a venta
  convertDemo: (token: string, id: string, data: ConvertDemoData) =>
    fetchAPI<{ success: boolean; client: Client }>(`/api/clients/${id}/convert`, {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  // Estadisticas de clientes
  getStats: (token: string) =>
    fetchAPI<{ success: boolean; stats: ClientStats }>("/api/clients/stats/summary", { token }),

  getPayments: (token: string, clientId: string) =>
    fetchAPI<{ success: boolean; payments: Payment[] }>(`/api/clients/${clientId}/payments`, { token }),

  addPayment: (token: string, clientId: string, data: { amount: number; period: string; paymentMethod?: string; paymentDate?: string; notes?: string }) =>
    fetchAPI<{ success: boolean; payment: Payment }>(`/api/clients/${clientId}/payments`, {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),
}

// Collections API (Cobranzas)
export const collectionsAPI = {
  getAll: (token: string) =>
    fetchAPI<{ success: boolean; collections: CollectionItem[] }>("/api/collections", { token }),

  sendReminder: (token: string, clientId: string, type: "5_dias" | "15_dias" | "30_dias" | "manual") =>
    fetchAPI<{ success: boolean; emailSent: boolean }>(`/api/collections/send-reminder/${clientId}`, {
      method: "POST",
      token,
      body: JSON.stringify({ type }),
    }),
}

// Transactions API
export const transactionsAPI = {
  getAll: (token: string, filters?: { type?: string; month?: string; category?: string }) => {
    const params = new URLSearchParams()
    if (filters?.type) params.append("type", filters.type)
    if (filters?.month) params.append("month", filters.month)
    if (filters?.category) params.append("category", filters.category)
    const query = params.toString() ? `?${params.toString()}` : ""
    return fetchAPI<{ success: boolean; transactions: Transaction[] }>(`/api/transactions${query}`, { token })
  },

  create: (token: string, data: { type: TransactionType; category: string; amount: number; description: string; date?: string; clientId?: string; notes?: string }) =>
    fetchAPI<{ success: boolean; transaction: Transaction }>("/api/transactions", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  getSummary: (token: string, month?: string) => {
    const query = month ? `?month=${month}` : ""
    return fetchAPI<{ success: boolean; summary: { ingresos: number; egresos: number; balance: number } }>(`/api/transactions/summary${query}`, { token })
  },

  delete: (token: string, id: string) =>
    fetchAPI<{ success: boolean; message: string }>(`/api/transactions/${id}`, {
      method: "DELETE",
      token,
    }),
}

// Liquidations API
export const liquidationsAPI = {
  getAll: (token: string, filters?: { userId?: string; period?: string; status?: string }) => {
    const params = new URLSearchParams()
    if (filters?.userId) params.append("userId", filters.userId)
    if (filters?.period) params.append("period", filters.period)
    if (filters?.status) params.append("status", filters.status)
    const query = params.toString() ? `?${params.toString()}` : ""
    return fetchAPI<{ success: boolean; liquidations: Liquidation[] }>(`/api/liquidations${query}`, { token })
  },

  create: (token: string, data: { userId: string; period: string; totalAmount: number; details?: Array<{ saleId?: string; amount: number; description: string }>; notes?: string }) =>
    fetchAPI<{ success: boolean; liquidation: Liquidation }>("/api/liquidations", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  pay: (token: string, id: string, data: { paymentMethod: string; notes?: string }) =>
    fetchAPI<{ success: boolean; liquidation: Liquidation }>(`/api/liquidations/${id}/pay`, {
      method: "PUT",
      token,
      body: JSON.stringify(data),
    }),
}

// Companies API
export const companiesAPI = {
  getAll: (token: string) =>
    fetchAPI<{ success: boolean; companies: Array<{ id: string; name: string; displayName: string; isActive: boolean }> }>("/api/companies", { token }),
}

// Advances (Adelantos) API - Adelantos de dinero que se descuentan de la comision
export interface Advance {
  _id: string
  userId: string | { _id: string; name: string; email: string; role: string }
  amount: number
  date: string
  month: string // Mes al que se aplica el descuento (formato YYYY-MM)
  reason: string
  createdBy: string | { _id: string; name: string }
  createdAt: string
  updatedAt: string
}

export const advancesAPI = {
  // Admin: obtener todos los adelantos
  getAll: (token: string, month?: string, userId?: string) => {
    const params = new URLSearchParams()
    if (month) params.append("month", month)
    if (userId) params.append("userId", userId)
    const queryString = params.toString() ? `?${params.toString()}` : ""
    return fetchAPI<{ success: boolean; advances: Advance[] }>(`/api/admin/advances${queryString}`, { token })
  },

  // Admin: crear adelanto
  create: (token: string, data: { userId: string; amount: number; date: string; month: string; reason: string }) =>
    fetchAPI<{ success: boolean; advance: Advance; message: string }>("/api/admin/advances", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  // Admin: eliminar adelanto
  delete: (token: string, id: string) =>
    fetchAPI<{ success: boolean }>(`/api/admin/advances/${id}`, {
      method: "DELETE",
      token,
    }),

  // Usuario: obtener mis adelantos
  getMine: (token: string, month?: string) => {
    const queryString = month ? `?month=${month}` : ""
    return fetchAPI<{ success: boolean; advances: Advance[] }>(`/api/advances/my${queryString}`, { token })
  },
}

// Liquidation Email API - Envio de liquidaciones por email y gestion de facturas
export interface LiquidationEmailRecord {
  _id: string
  userId: string | { _id: string; name: string; email: string }
  period: string
  totalAmount: number
  emailSentTo: string
  emailSentAt: string
  sentBy: string | { _id: string; name: string }
  invoiceUploaded: boolean
  invoiceUrl?: string
  invoiceUploadedAt?: string
  invoiceStatus: "pending" | "uploaded" | "processed" | "paid"
  paymentDate?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export const liquidationEmailsAPI = {
  // Enviar liquidacion por email
  sendEmail: (token: string, data: { userId: string; period: string; totalAmount: number; liquidationHtml?: string; pdfBase64?: string }) =>
    fetchAPI<{ success: boolean; message: string; liquidationEmailId: string }>("/api/liquidations/send-email", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  // Obtener liquidaciones enviadas
  getAll: (token: string, filters?: { userId?: string; period?: string }) => {
    const params = new URLSearchParams()
    if (filters?.userId) params.append("userId", filters.userId)
    if (filters?.period) params.append("period", filters.period)
    const query = params.toString() ? `?${params.toString()}` : ""
    return fetchAPI<{ success: boolean; liquidationEmails: LiquidationEmailRecord[] }>(`/api/liquidations/emails${query}`, { token })
  },

  // Subir factura
  uploadInvoice: async (token: string, id: string, file: File) => {
    const formData = new FormData()
    formData.append("invoice", file)
    
    const response = await fetch(`${API_BASE_URL}/api/liquidations/emails/${id}/upload-invoice`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Error uploading invoice")
    }
    
    return response.json() as Promise<{ success: boolean; message: string; invoiceUrl: string }>
  },

  // Actualizar estado de factura
  updateStatus: (token: string, id: string, data: { invoiceStatus: string; paymentDate?: string; notes?: string }) =>
    fetchAPI<{ success: boolean; liquidationEmail: LiquidationEmailRecord }>(`/api/liquidations/emails/${id}/status`, {
      method: "PUT",
      token,
      body: JSON.stringify(data),
    }),
}

// ========================================
// MARKETING MATERIALS API
// ========================================

export type MaterialCategory = "induccion" | "publicidad" | "demos_entregadas"
export type MaterialFileType = "image" | "video" | "document" | "other"

export interface MarketingMaterial {
  _id: string
  companyId: string
  category: MaterialCategory
  name: string
  description?: string
  fileType: MaterialFileType
  fileName: string
  fileUrl: string
  mimeType?: string
  fileSize?: number
  uploadedBy?: { _id: string; name: string }
  createdAt: string
  updatedAt: string
}

export const materialsAPI = {
  // Obtener todos los materiales (opcionalmente filtrar por categoria)
  getAll: (token: string, category?: MaterialCategory) => {
    const query = category ? `?category=${category}` : ""
    return fetchAPI<{ success: boolean; materials: MarketingMaterial[] }>(`/api/materials${query}`, { token })
  },

  // Subir nuevo material (admin only)
  upload: async (token: string, data: { category: MaterialCategory; name: string; description?: string }, file: File) => {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("category", data.category)
    formData.append("name", data.name)
    if (data.description) formData.append("description", data.description)
    
    const companyId = getStoredCompanyId()
    
    const response = await fetch(`${API_URL}/api/materials`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Company-ID": companyId,
      },
      body: formData,
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Error uploading material")
    }
    
    return response.json() as Promise<{ success: boolean; material: MarketingMaterial; message: string }>
  },

  // Eliminar material (admin only)
  delete: (token: string, id: string) =>
    fetchAPI<{ success: boolean; message: string }>(`/api/materials/${id}`, {
      method: "DELETE",
      token,
    }),

  // Obtener URL completa para ver un archivo
  getViewUrl: (materialId: string) => `${API_URL}/api/materials/${materialId}/view`,
  
  // Obtener URL completa para descargar un archivo
  getDownloadUrl: (materialId: string) => `${API_URL}/api/materials/${materialId}/download`,
  
  // Obtener URL del archivo (resuelve URLs relativas a URLs completas del backend)
  getFileUrl: (fileUrl: string) => {
    if (fileUrl.startsWith("/uploads/")) {
      return `${API_URL}${fileUrl}`
    }
    return fileUrl
  },
}

// ========================================
// TUPAGINAYA API (TPY_*)
// Endpoints separados para TuPaginaYa
// ========================================

// Estados de TuPaginaYa
export const TPY_STATUS = {
  PENDIENTE_DEMO: "pendiente_demo",
  DEMO_ENVIADA: "demo_enviada",
  DEMO_PAUSADA: "demo_pausada",
  PENDIENTE_WEB: "pendiente_web",
  WEB_ACTIVADA: "web_activada",
  BAJA: "baja",
} as const

export const TPY_STATUS_LABELS: Record<string, string> = {
  pendiente_demo: "Pendiente de Demo",
  demo_enviada: "Demo Enviada",
  demo_pausada: "Demo Pausada",
  pendiente_web: "Pendiente Web",
  web_activada: "Web Activada",
  baja: "Baja",
}

export const TPY_STATUS_COLORS: Record<string, string> = {
  pendiente_demo: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  demo_enviada: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  demo_pausada: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  pendiente_web: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  web_activada: "bg-green-500/20 text-green-400 border-green-500/30",
  baja: "bg-red-500/20 text-red-400 border-red-500/30",
}

// Interfaces TPY
export interface TPY_Client {
  _id: string
  name: string
  phone: string
  email?: string
  webName: string
  domain?: string
  demoUrl?: string
  status: keyof typeof TPY_STATUS_LABELS
  activationPrice: number
  monthlyPrice: number
  createdDate: string
  activationDate?: string
  cancellationDate?: string
  cancellationReason?: string
  sellerId?: string | { _id: string; name: string; email?: string }
  sellerName?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface TPY_Demo {
  _id: string
  clientId?: string | TPY_Client
  name: string
  phone?: string
  email?: string
  webName: string
  demoUrl?: string
  status: keyof typeof TPY_STATUS_LABELS
  activationPrice: number
  monthlyPrice: number
  demoDate: string
  activationDate?: string
  sellerId?: string | { _id: string; name: string }
  sellerName?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface TPY_Sale {
  _id: string
  clientId: string | TPY_Client
  clientName: string
  clientPhone?: string
  webName: string
  domain?: string
  status: keyof typeof TPY_STATUS_LABELS
  activationPrice: number
  monthlyPrice: number
  saleDate: string
  activationDate?: string
  sellerId: string | { _id: string; name: string }
  sellerName: string
  commission: number
  commissionPaid: boolean
  supervisorId?: string | { _id: string; name: string }
  supervisorName?: string
  supervisorCommission?: number
  supervisorCommissionPaid?: boolean
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface TPY_Transaction {
  _id: string
  type: "ingreso" | "egreso"
  category: string
  concept: string
  amount: number
  date: string
  month: string
  clientId?: string | TPY_Client
  clientName?: string
  recordedBy?: string | { _id: string; name: string }
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface TPY_CollectionPayment {
  _id?: string
  month: string
  amount: number
  paymentDate: string
  paymentMethod?: string
  notes?: string
  recordedBy?: string | { _id: string; name: string }
}

export interface TPY_CollectionReminder {
  _id?: string
  sentAt: string
  type: "5_dias" | "15_dias" | "30_dias" | "manual"
  sentBy?: string | { _id: string; name: string }
  emailSent: boolean
  notes?: string
}

export interface TPY_Collection {
  _id: string
  clientId: string | TPY_Client
  clientName: string
  clientPhone?: string
  clientEmail?: string
  webName: string
  domain?: string
  monthlyAmount: number
  lastPaymentDate?: string
  lastPaymentAmount?: number
  payments: TPY_CollectionPayment[]
  reminders: TPY_CollectionReminder[]
  billingDay: number
  status: "al_dia" | "pendiente" | "atrasado" | "critico" | "pausado"
  notes?: string
  createdAt: string
  updatedAt: string
  
  // Campos calculados (no en DB)
  daysSinceLastPayment?: number
  needsReminder?: boolean
  lastPaidMonth?: string // YYYY-MM del ultimo mes pagado
}

export interface TPY_Stats {
  clientsByStatus: Record<string, number>
  activeClients: number
  totalDemos: number
  salesThisMonth: number
  collections: {
    total: number
    paid: number
    pending: number
    expectedAmount: number
    paidAmount: number
  }
  transactions: {
    ingresos: number
    egresos: number
    balance: number
  }
}

// TPY Clients API
export const tpyClientsAPI = {
  getAll: (token: string, filters?: { status?: string; month?: string; search?: string }) => {
    const params = new URLSearchParams()
    if (filters?.status) params.append("status", filters.status)
    if (filters?.month) params.append("month", filters.month)
    if (filters?.search) params.append("search", filters.search)
    const query = params.toString() ? `?${params.toString()}` : ""
    return fetchAPI<{ success: boolean; clients: TPY_Client[] }>(`/api/tpy/clients${query}`, { token })
  },

  getById: (token: string, id: string) =>
    fetchAPI<{ success: boolean; client: TPY_Client }>(`/api/tpy/clients/${id}`, { token }),

  create: (token: string, data: Partial<TPY_Client>) =>
    fetchAPI<{ success: boolean; client: TPY_Client }>("/api/tpy/clients", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  update: (token: string, id: string, data: Partial<TPY_Client>) =>
    fetchAPI<{ success: boolean; client: TPY_Client }>(`/api/tpy/clients/${id}`, {
      method: "PUT",
      token,
      body: JSON.stringify(data),
    }),

  updateStatus: (token: string, id: string, status: string) =>
    fetchAPI<{ success: boolean; client: TPY_Client }>(`/api/tpy/clients/${id}/status`, {
      method: "PATCH",
      token,
      body: JSON.stringify({ status }),
    }),

  delete: (token: string, id: string) =>
    fetchAPI<{ success: boolean; message: string }>(`/api/tpy/clients/${id}`, {
      method: "DELETE",
      token,
    }),
}

// TPY Demos API
export const tpyDemosAPI = {
  getAll: (token: string, filters?: { status?: string; month?: string; search?: string }) => {
    const params = new URLSearchParams()
    if (filters?.status) params.append("status", filters.status)
    if (filters?.month) params.append("month", filters.month)
    if (filters?.search) params.append("search", filters.search)
    const query = params.toString() ? `?${params.toString()}` : ""
    return fetchAPI<{ success: boolean; demos: TPY_Demo[] }>(`/api/tpy/demos${query}`, { token })
  },

  getMyDemos: (token: string, filters?: { status?: string; month?: string; search?: string }) => {
    const params = new URLSearchParams()
    if (filters?.status) params.append("status", filters.status)
    if (filters?.month) params.append("month", filters.month)
    if (filters?.search) params.append("search", filters.search)
    const query = params.toString() ? `?${params.toString()}` : ""
    return fetchAPI<{ success: boolean; demos: TPY_Demo[] }>(`/api/tpy/demos/my${query}`, { token })
  },

  getById: (token: string, id: string) =>
    fetchAPI<{ success: boolean; demo: TPY_Demo }>(`/api/tpy/demos/${id}`, { token }),

  create: (token: string, data: Partial<TPY_Demo>) =>
    fetchAPI<{ success: boolean; demo: TPY_Demo }>("/api/tpy/demos", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  update: (token: string, id: string, data: Partial<TPY_Demo>) =>
    fetchAPI<{ success: boolean; demo: TPY_Demo }>(`/api/tpy/demos/${id}`, {
      method: "PUT",
      token,
      body: JSON.stringify(data),
    }),

  updateStatus: (token: string, id: string, status: string) =>
    fetchAPI<{ success: boolean; demo: TPY_Demo }>(`/api/tpy/demos/${id}/status`, {
      method: "PATCH",
      token,
      body: JSON.stringify({ status }),
    }),

  convert: (token: string, id: string, data: { domain?: string; activationPrice?: number; monthlyPrice?: number }) =>
    fetchAPI<{ success: boolean; client: TPY_Client; sale: TPY_Sale; demo: TPY_Demo }>(`/api/tpy/demos/${id}/convert`, {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  delete: (token: string, id: string) =>
    fetchAPI<{ success: boolean; message: string }>(`/api/tpy/demos/${id}`, {
      method: "DELETE",
      token,
    }),

  // Create demo with file uploads
  createWithFiles: async (token: string, formData: FormData) => {
    const response = await fetch(`${API_URL}/api/tpy/demos/with-files`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Error creating demo")
    }
    return response.json() as Promise<{ success: boolean; demo: TPY_Demo }>
  },

  // Upload files to existing demo
  uploadFiles: async (token: string, id: string, formData: FormData) => {
    const response = await fetch(`${API_URL}/api/tpy/demos/${id}/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Error uploading files")
    }
    return response.json() as Promise<{ success: boolean; demo: TPY_Demo }>
  },
}

// General file upload utility
export const uploadFile = async (token: string, file: File, folder: string = "general") => {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("folder", folder)
  
  const response = await fetch(`${API_URL}/api/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Error uploading file")
  }
  return response.json() as Promise<{ success: boolean; url: string; filename: string; type: string }>
}

// TPY Sales API
export const tpySalesAPI = {
  getAll: (token: string, filters?: { status?: string; month?: string; search?: string; sellerId?: string }) => {
    const params = new URLSearchParams()
    if (filters?.status) params.append("status", filters.status)
    if (filters?.month) params.append("month", filters.month)
    if (filters?.search) params.append("search", filters.search)
    if (filters?.sellerId) params.append("sellerId", filters.sellerId)
    const query = params.toString() ? `?${params.toString()}` : ""
    return fetchAPI<{ success: boolean; sales: TPY_Sale[] }>(`/api/tpy/sales${query}`, { token })
  },

  create: (token: string, data: Partial<TPY_Sale>) =>
    fetchAPI<{ success: boolean; sale: TPY_Sale }>("/api/tpy/sales", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  update: (token: string, id: string, data: Partial<TPY_Sale>) =>
    fetchAPI<{ success: boolean; sale: TPY_Sale }>(`/api/tpy/sales/${id}`, {
      method: "PUT",
      token,
      body: JSON.stringify(data),
    }),

  updateStatus: (token: string, id: string, status: string) =>
    fetchAPI<{ success: boolean; sale: TPY_Sale }>(`/api/tpy/sales/${id}/status`, {
      method: "PATCH",
      token,
      body: JSON.stringify({ status }),
    }),
}

// TPY Transactions API (Caja)
export const tpyTransactionsAPI = {
  getAll: (token: string, filters?: { type?: string; month?: string; category?: string }) => {
    const params = new URLSearchParams()
    if (filters?.type) params.append("type", filters.type)
    if (filters?.month) params.append("month", filters.month)
    if (filters?.category) params.append("category", filters.category)
    const query = params.toString() ? `?${params.toString()}` : ""
    return fetchAPI<{ 
      success: boolean
      transactions: TPY_Transaction[]
      totals: { ingresos: number; egresos: number; balance: number }
    }>(`/api/tpy/transactions${query}`, { token })
  },

  create: (token: string, data: Partial<TPY_Transaction>) =>
    fetchAPI<{ success: boolean; transaction: TPY_Transaction }>("/api/tpy/transactions", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  update: (token: string, id: string, data: Partial<TPY_Transaction>) =>
    fetchAPI<{ success: boolean; transaction: TPY_Transaction }>(`/api/tpy/transactions/${id}`, {
      method: "PUT",
      token,
      body: JSON.stringify(data),
    }),

  delete: (token: string, id: string) =>
    fetchAPI<{ success: boolean; message: string }>(`/api/tpy/transactions/${id}`, {
      method: "DELETE",
      token,
    }),
}

// TPY Collections API (Cobranzas - perfil por cliente)
export const tpyCollectionsAPI = {
  // Sincronizar clientes existentes con perfiles de cobranza
  sync: (token: string) =>
    fetchAPI<{ success: boolean; message: string }>("/api/tpy/collections/sync", {
      method: "POST",
      token,
    }),

  // Obtener todos los perfiles de cobranza
  getAll: (token: string, filters?: { status?: string; search?: string }) => {
    const params = new URLSearchParams()
    if (filters?.status) params.append("status", filters.status)
    if (filters?.search) params.append("search", filters.search)
    const query = params.toString() ? `?${params.toString()}` : ""
    return fetchAPI<{
      success: boolean
      collections: TPY_Collection[]
      stats: {
        total: number
        alDia: number
        pendiente: number
        atrasado: number
        critico: number
        montoMensualTotal: number
      }
    }>(`/api/tpy/collections${query}`, { token })
  },
  
  // Obtener un perfil de cobranza por ID
  getById: (token: string, id: string) =>
    fetchAPI<{ success: boolean; collection: TPY_Collection }>(`/api/tpy/collections/${id}`, { token }),
  
  // Registrar un pago (createTransaction: true para sumar a ingresos/egresos)
  addPayment: (token: string, id: string, payment: { month: string; amount: number; paymentMethod?: string; notes?: string; createTransaction?: boolean }) =>
    fetchAPI<{ success: boolean; collection: TPY_Collection; transactionCreated: boolean; message: string }>(`/api/tpy/collections/${id}/payments`, {
      method: "POST",
      token,
      body: JSON.stringify(payment),
    }),
  
  // Eliminar un pago
  deletePayment: (token: string, collectionId: string, paymentId: string) =>
    fetchAPI<{ success: boolean; collection: TPY_Collection; message: string }>(`/api/tpy/collections/${collectionId}/payments/${paymentId}`, {
      method: "DELETE",
      token,
    }),
  
  // Enviar recordatorio de cobro
  sendReminder: (token: string, id: string, type: "5_dias" | "15_dias" | "30_dias" | "manual", notes?: string) =>
    fetchAPI<{ success: boolean; collection: TPY_Collection; emailSent: boolean; message: string }>(`/api/tpy/collections/${id}/reminders`, {
      method: "POST",
      token,
      body: JSON.stringify({ type, notes }),
    }),
  
  // Actualizar perfil de cobranza (fecha de corte, notas, etc)
  update: (token: string, id: string, data: { billingDay?: number; notes?: string; status?: string; monthlyAmount?: number }) =>
    fetchAPI<{ success: boolean; collection: TPY_Collection }>(`/api/tpy/collections/${id}`, {
      method: "PUT",
      token,
      body: JSON.stringify(data),
    }),
  
  // Eliminar cliente de cobranzas
  delete: (token: string, id: string) =>
    fetchAPI<{ success: boolean; message: string }>(`/api/tpy/collections/${id}`, {
      method: "DELETE",
      token,
    }),
}

// TPY Stats API
export const tpyStatsAPI = {
  get: (token: string, month?: string) => {
    const query = month ? `?month=${month}` : ""
    return fetchAPI<{ success: boolean; stats: TPY_Stats }>(`/api/tpy/stats${query}`, { token })
  },
}

// TPY Import API
export const tpyImportAPI = {
  import: (token: string, type: "clients" | "demos" | "sales" | "transactions" | "collections", data: unknown[]) =>
    fetchAPI<{ success: boolean; message: string; imported: number; errors: { index: number; error: string }[] }>("/api/tpy/import", {
      method: "POST",
      token,
      body: JSON.stringify({ type, data }),
    }),
}

// ========================================
// SEGUROS MODULE - Types & Interfaces
// ========================================

export type PolizaEstado = "vigente" | "pendiente_pago" | "en_mora" | "renovacion" | "anulada" | "vencida"
export type FormaPago = "efectivo" | "cupon" | "debito" | "credito" | "transferencia"
export type FrecuenciaPago = "mensual" | "bimestral" | "trimestral" | "semestral" | "anual"
export type CobranzaEstado = "pendiente" | "pagado" | "vencido" | "mora"
export type SiniestroEstado = "EN_TRAMITE" | "FINALIZADO" | "RECHAZADO"
export type LiquidacionSeguroEstado = "borrador" | "aprobada" | "pagada"

export interface BienAsegurado {
  tipo?: string
  marca?: string
  modelo?: string
  anio?: number
  patente?: string
  sumaAsegurada?: number
}

// WAC Seguros — Poliza schema (matches WACSegurosBE server.js)
export interface Poliza {
  _id: string
  // Póliza
  numPoliza?: string
  aseguradora?: string
  ramo?: string
  tipoCobertura?: string
  fechaInicVig?: string
  // Estado y pago
  estado: "VIGENTE" | "ANULADA" | "PENDIENTE_CLIENTE"
  motivoAnulacion?: string
  fechaAnulacion?: string
  medioDePago?: string
  // Asegurado
  nombreApellido: string
  dni?: string
  fechaNacimiento?: string
  celular?: string
  email?: string
  domicilio?: string
  localidad?: string
  cp?: string
  // Riesgo
  patente?: string
  datosRiesgo?: string
  chasis?: string
  motor?: string
  gnc?: boolean
  // Meta
  creadoPor?: string
  createdAt: string
  updatedAt: string
}

export interface CobranzaSeguro {
  _id: string
  companyId: string
  polizaId: string | Poliza
  numeroPoliza: string
  clienteNombre: string
  clienteTelefono?: string
  aseguradora: string
  numeroCuota: number
  mesAnio: string
  montoCuota: number
  estado: CobranzaEstado
  fechaVencimiento: string
  fechaPago?: string
  montoPagado?: number
  formaPago?: FormaPago
  recordatoriosEnviados?: number
  ultimoRecordatorio?: string
  observaciones?: string
  registradoPor?: string | { _id: string; name: string }
  createdAt: string
  updatedAt: string
}

export interface SiniestroHistorial {
  estado: string
  fecha: string
  usuario: string
  observacion?: string
}

export interface SiniestroDocumento {
  nombre: string
  url: string
  fechaSubida: string
}

export interface Siniestro {
  _id: string
  numPoliza?: string
  polizaId?: string
  bienAsegurado?: string
  fechaOcurrencia?: string
  tipoSiniestro?: "ROBO_TOTAL" | "ROBO_PARCIAL" | "DAÑO_TOTAL" | "CHOQUE_ACCIDENTE" | "CRISTALES" | "INCENDIO" | "GRANIZO" | "OTRO"
  compania?: string
  asegurado: string
  denunciaAdministrativa?: "REALIZADA" | "PENDIENTE"
  numeroSiniestro?: string
  estado: SiniestroEstado
  observaciones?: string
  creadoPor?: string
  createdAt: string
  updatedAt: string
}

export interface ComisionSeguro {
  _id: string
  companyId: string
  aseguradora: string
  ramo?: string
  comisionBase: number
  comisionVida?: number
  productorId?: string | { _id: string; name: string; email?: string }
  productorNombre?: string
  comisionFija?: number
  tipo: "aseguradora" | "productor"
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface DetalleLiquidacionAseguradora {
  aseguradora: string
  polizas: number
  primaTotal: number
  comision: number
}

export interface LiquidacionSeguro {
  _id: string
  companyId: string
  mes: string
  productorId: string | { _id: string; name: string; email?: string }
  productorNombre: string
  totalPolizasEmitidas: number
  totalPrimaEmitida: number
  totalComisionBruta: number
  totalDescuentos: number
  totalComisionNeta: number
  detallePorAseguradora?: DetalleLiquidacionAseguradora[]
  estado: LiquidacionSeguroEstado
  fechaPago?: string
  observaciones?: string
  aprobadoPor?: string | { _id: string; name: string }
  createdAt: string
  updatedAt: string
}

export interface ClienteSeguro {
  _id: string
  companyId: string
  dni: string
  nombre: string
  telefono?: string
  email?: string
  domicilio?: string
  localidad?: string
  provincia?: string
  codigoPostal?: string
  fechaNacimiento?: string
  totalPolizas?: number
  polizasActivas?: number
  totalPrimas?: number
  observaciones?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface SegurosDashboardStats {
  polizas: {
    total: number
    vigentes: number
    anuladas: number
    enMora: number
    totalPrimas: number
  }
  cobranzas: {
    pendientes: number
    pagadas: number
    vencidas: number
    montoPendiente: number
    montoCobrado: number
  }
  siniestrosActivos: number
  totalClientes: number
}

// ========================================
// SEGUROS MODULE - APIs
// ========================================

// Polizas API
export const polizasAPI = {
  getAll: (token: string, filters?: { aseguradora?: string; estado?: string; ramo?: string; search?: string; productorId?: string }) => {
    const params = new URLSearchParams()
    if (filters?.aseguradora) params.append("aseguradora", filters.aseguradora)
    if (filters?.estado) params.append("estado", filters.estado)
    if (filters?.ramo) params.append("ramo", filters.ramo)
    if (filters?.search) params.append("search", filters.search)
    if (filters?.productorId) params.append("productorId", filters.productorId)
    const query = params.toString() ? `?${params.toString()}` : ""
    return fetchAPI<{ success: boolean; polizas: Poliza[] }>(`/api/seguros/polizas${query}`, { token })
  },

  getById: (token: string, id: string) =>
    fetchAPI<{ success: boolean; poliza: Poliza }>(`/api/seguros/polizas/${id}`, { token }),

  create: (token: string, data: Partial<Poliza>) =>
    fetchAPI<{ success: boolean; poliza: Poliza; message: string }>("/api/seguros/polizas", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  update: (token: string, id: string, data: Partial<Poliza>) =>
    fetchAPI<{ success: boolean; poliza: Poliza; message: string }>(`/api/seguros/polizas/${id}`, {
      method: "PUT",
      token,
      body: JSON.stringify(data),
    }),

  anular: (token: string, id: string, motivoAnulacion: string) =>
    fetchAPI<{ success: boolean; poliza: Poliza; message: string }>(`/api/seguros/polizas/${id}/anular`, {
      method: "POST",
      token,
      body: JSON.stringify({ motivoAnulacion }),
    }),

  generarCuotas: (token: string, id: string) =>
    fetchAPI<{ success: boolean; cuotas: CobranzaSeguro[]; message: string }>(`/api/seguros/polizas/${id}/generar-cuotas`, {
      method: "POST",
      token,
    }),

  getStats: (token: string) =>
    fetchAPI<{ success: boolean; stats: Record<string, unknown>; porAseguradora: Array<{ _id: string; cantidad: number; primas: number }> }>("/api/seguros/polizas-stats", { token }),

  delete: (token: string, id: string) =>
    fetchAPI<{ success: boolean; message: string }>(`/api/seguros/polizas/${id}`, {
      method: "DELETE",
      token,
    }),

  renovar: (token: string, id: string, data: { vigenciaDesde?: string; vigenciaHasta?: string; primaTotal?: number; primaMensual?: number }) =>
    fetchAPI<{ success: boolean; poliza: Poliza; message: string }>(`/api/seguros/polizas/${id}/renovar`, {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  asignar: (token: string, id: string, productorId: string) =>
    fetchAPI<{ success: boolean; poliza: Poliza; message: string }>(`/api/seguros/polizas/${id}/asignar`, {
      method: "POST",
      token,
      body: JSON.stringify({ productorId }),
    }),
}

// ── Scoring DNI (Equifax INTREPOR) ────────────────────────────────────────────
export interface ScoringTokenStatus {
  success: boolean
  hasToken: boolean
  autoRefresh: boolean
  updatedAt?: string
  updatedBy?: string
  accessTokenExpiresAt?: string
  accessTokenOk?: boolean
}

export interface ScoringResult {
  success: boolean
  aprobado: boolean | null
  score: number | null
  fechaNacimiento: string | null
  nombre: string | null
  nroDocumento: string | null
  nroCuit: string | null
  tokenExpired?: boolean
  message?: string
  rawData?: unknown
}

export const scoringDniAPI = {
  // Admin: gestión de token + consulta
  getTokenStatus: (token: string) =>
    fetchAPI<ScoringTokenStatus>("/api/admin/scoring-dni/token-status", { token }),

  updateToken: (token: string, equifaxToken: string) =>
    fetchAPI<{ success: boolean; message: string; updatedAt: string }>(
      "/api/admin/scoring-dni/token",
      { method: "PUT", token, body: JSON.stringify({ token: equifaxToken }) }
    ),

  consultar: (token: string, cuil: string) =>
    fetchAPI<ScoringResult>("/api/admin/scoring-dni/consultar", {
      method: "POST",
      token,
      body: JSON.stringify({ cuil }),
    }),

  // Supervisor / Soporte: solo consulta (sin gestión de token)
  getDisponible: (token: string) =>
    fetchAPI<{ success: boolean; disponible: boolean }>("/api/scoring-dni/disponible", { token }),

  consultarUser: (token: string, cuil: string) =>
    fetchAPI<ScoringResult>("/api/scoring-dni/consultar", {
      method: "POST",
      token,
      body: JSON.stringify({ cuil }),
    }),
}

// Cobranzas Seguros API
export const cobranzasSegurosAPI = {
  getAll: (token: string, filters?: { estado?: string; mesAnio?: string; aseguradora?: string; search?: string }) => {
    const params = new URLSearchParams()
    if (filters?.estado) params.append("estado", filters.estado)
    if (filters?.mesAnio) params.append("mesAnio", filters.mesAnio)
    if (filters?.aseguradora) params.append("aseguradora", filters.aseguradora)
    if (filters?.search) params.append("search", filters.search)
    const query = params.toString() ? `?${params.toString()}` : ""
    return fetchAPI<{ success: boolean; cobranzas: CobranzaSeguro[] }>(`/api/seguros/cobranzas${query}`, { token })
  },

  registrarPago: (token: string, id: string, data: { montoPagado: number; formaPago: string; observaciones?: string }) =>
    fetchAPI<{ success: boolean; cobranza: CobranzaSeguro; message: string }>(`/api/seguros/cobranzas/${id}/pagar`, {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  enviarRecordatorio: (token: string, id: string) =>
    fetchAPI<{ success: boolean; whatsappUrl: string; message: string }>(`/api/seguros/cobranzas/${id}/recordatorio`, {
      method: "POST",
      token,
    }),

  getStats: (token: string, mesAnio?: string) => {
    const query = mesAnio ? `?mesAnio=${mesAnio}` : ""
    return fetchAPI<{ success: boolean; stats: Record<string, unknown> }>(`/api/seguros/cobranzas-stats${query}`, { token })
  },

  getById: (token: string, id: string) =>
    fetchAPI<{ success: boolean; cobranza: CobranzaSeguro }>(`/api/seguros/cobranzas/${id}`, { token }),

  update: (token: string, id: string, data: Partial<CobranzaSeguro>) =>
    fetchAPI<{ success: boolean; cobranza: CobranzaSeguro; message: string }>(`/api/seguros/cobranzas/${id}`, {
      method: "PUT",
      token,
      body: JSON.stringify(data),
    }),

  delete: (token: string, id: string) =>
    fetchAPI<{ success: boolean; message: string }>(`/api/seguros/cobranzas/${id}`, {
      method: "DELETE",
      token,
    }),

  actualizarVencidas: (token: string) =>
    fetchAPI<{ success: boolean; message: string; actualizadas: number }>("/api/seguros/cobranzas/actualizar-vencidas", {
      method: "POST",
      token,
    }),
}

// Siniestros API
export const siniestrosAPI = {
  getAll: (token: string, filters?: { estado?: string; aseguradora?: string; search?: string }) => {
    const params = new URLSearchParams()
    if (filters?.estado) params.append("estado", filters.estado)
    if (filters?.aseguradora) params.append("aseguradora", filters.aseguradora)
    if (filters?.search) params.append("search", filters.search)
    const query = params.toString() ? `?${params.toString()}` : ""
    return fetchAPI<{ success: boolean; siniestros: Siniestro[] }>(`/api/seguros/siniestros${query}`, { token })
  },

  create: (token: string, data: Partial<Siniestro>) =>
    fetchAPI<{ success: boolean; siniestro: Siniestro; message: string }>("/api/seguros/siniestros", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  updateEstado: (token: string, id: string, data: { estado: SiniestroEstado; observacion?: string; montoLiquidado?: number }) =>
    fetchAPI<{ success: boolean; siniestro: Siniestro; message: string }>(`/api/seguros/siniestros/${id}/estado`, {
      method: "PUT",
      token,
      body: JSON.stringify(data),
    }),

  getStats: (token: string) =>
    fetchAPI<{ success: boolean; stats: Record<string, unknown> }>("/api/seguros/siniestros-stats", { token }),

  getById: (token: string, id: string) =>
    fetchAPI<{ success: boolean; siniestro: Siniestro }>(`/api/seguros/siniestros/${id}`, { token }),

  update: (token: string, id: string, data: Partial<Siniestro>) =>
    fetchAPI<{ success: boolean; siniestro: Siniestro; message: string }>(`/api/seguros/siniestros/${id}`, {
      method: "PUT",
      token,
      body: JSON.stringify(data),
    }),

  delete: (token: string, id: string) =>
    fetchAPI<{ success: boolean; message: string }>(`/api/seguros/siniestros/${id}`, {
      method: "DELETE",
      token,
    }),
}

// Seguimiento API
export interface Seguimiento {
  _id: string
  patente?: string
  nombre?: string
  apellido?: string
  dni?: string
  email?: string
  celular?: string
  estado: "NUEVO" | "CONTACTADO" | "COTIZANDO" | "EMITIDO" | "RECHAZADO"
  observaciones?: string
  fechaContacto?: string
  createdAt: string
  updatedAt: string
}

export const seguimientoAPI = {
  getAll: (token: string, params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : ""
    return fetchAPI<{ success: boolean; seguimientos: Seguimiento[] }>(`/api/seguros/seguimiento${qs}`, { token })
  },
  create: (token: string, data: Partial<Seguimiento>) =>
    fetchAPI<{ success: boolean; seguimiento: Seguimiento }>("/api/seguros/seguimiento", {
      method: "POST", token, body: JSON.stringify(data),
    }),
  update: (token: string, id: string, data: Partial<Seguimiento>) =>
    fetchAPI<{ success: boolean; seguimiento: Seguimiento }>(`/api/seguros/seguimiento/${id}`, {
      method: "PUT", token, body: JSON.stringify(data),
    }),
  delete: (token: string, id: string) =>
    fetchAPI<{ success: boolean }>(`/api/seguros/seguimiento/${id}`, { method: "DELETE", token }),
}

// Comisiones Seguros API
export const comisionesSegurosAPI = {
  getAll: (token: string, tipo?: "aseguradora" | "productor") => {
    const query = tipo ? `?tipo=${tipo}` : ""
    return fetchAPI<{ success: boolean; comisiones: ComisionSeguro[] }>(`/api/seguros/comisiones${query}`, { token })
  },

  create: (token: string, data: Partial<ComisionSeguro>) =>
    fetchAPI<{ success: boolean; comision: ComisionSeguro; message: string }>("/api/seguros/comisiones", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  update: (token: string, id: string, data: Partial<ComisionSeguro>) =>
    fetchAPI<{ success: boolean; comision: ComisionSeguro; message: string }>(`/api/seguros/comisiones/${id}`, {
      method: "PUT",
      token,
      body: JSON.stringify(data),
    }),

  delete: (token: string, id: string) =>
    fetchAPI<{ success: boolean; message: string }>(`/api/seguros/comisiones/${id}`, {
      method: "DELETE",
      token,
    }),
}

// Liquidaciones Seguros API
export const liquidacionesSegurosAPI = {
  getAll: (token: string, filters?: { mes?: string; productorId?: string; estado?: string }) => {
    const params = new URLSearchParams()
    if (filters?.mes) params.append("mes", filters.mes)
    if (filters?.productorId) params.append("productorId", filters.productorId)
    if (filters?.estado) params.append("estado", filters.estado)
    const query = params.toString() ? `?${params.toString()}` : ""
    return fetchAPI<{ success: boolean; liquidaciones: LiquidacionSeguro[] }>(`/api/seguros/liquidaciones${query}`, { token })
  },

  generar: (token: string, mes: string, productorId?: string) =>
    fetchAPI<{ success: boolean; liquidaciones: LiquidacionSeguro[]; message: string }>("/api/seguros/liquidaciones/generar", {
      method: "POST",
      token,
      body: JSON.stringify({ mes, productorId }),
    }),

  aprobar: (token: string, id: string) =>
    fetchAPI<{ success: boolean; liquidacion: LiquidacionSeguro; message: string }>(`/api/seguros/liquidaciones/${id}/aprobar`, {
      method: "POST",
      token,
    }),

  pagar: (token: string, id: string) =>
    fetchAPI<{ success: boolean; liquidacion: LiquidacionSeguro; message: string }>(`/api/seguros/liquidaciones/${id}/pagar`, {
      method: "POST",
      token,
    }),

  delete: (token: string, id: string) =>
    fetchAPI<{ success: boolean; message: string }>(`/api/seguros/liquidaciones/${id}`, {
      method: "DELETE",
      token,
    }),
}

// Clientes Seguros API
export const clientesSegurosAPI = {
  getAll: (token: string, filters?: { search?: string; isActive?: boolean }) => {
    const params = new URLSearchParams()
    if (filters?.search) params.append("search", filters.search)
    if (filters?.isActive !== undefined) params.append("isActive", String(filters.isActive))
    const query = params.toString() ? `?${params.toString()}` : ""
    return fetchAPI<{ success: boolean; clientes: ClienteSeguro[] }>(`/api/seguros/clientes${query}`, { token })
  },

  getByDni: (token: string, dni: string) =>
    fetchAPI<{ success: boolean; cliente: ClienteSeguro; polizas: Poliza[] }>(`/api/seguros/clientes/${dni}`, { token }),

  create: (token: string, data: Partial<ClienteSeguro>) =>
    fetchAPI<{ success: boolean; cliente: ClienteSeguro; message: string }>("/api/seguros/clientes", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  update: (token: string, dni: string, data: Partial<ClienteSeguro>) =>
    fetchAPI<{ success: boolean; cliente: ClienteSeguro; message: string }>(`/api/seguros/clientes/${dni}`, {
      method: "PUT",
      token,
      body: JSON.stringify(data),
    }),

  delete: (token: string, dni: string) =>
    fetchAPI<{ success: boolean; message: string }>(`/api/seguros/clientes/${dni}`, {
      method: "DELETE",
      token,
    }),
}

// Dashboard Seguros API
export const segurosDashboardAPI = {
  get: (token: string) =>
    fetchAPI<{ success: boolean; dashboard: SegurosDashboardStats }>("/api/seguros/dashboard", { token }),
}

// Import Seguros API
export const segurosImportAPI = {
  polizas: (token: string, polizas: Partial<Poliza>[]) =>
    fetchAPI<{ success: boolean; message: string; importadas: number; errores: number }>("/api/seguros/import/polizas", {
      method: "POST",
      token,
      body: JSON.stringify({ polizas }),
    }),

  cobranzas: (token: string, cobranzas: Partial<CobranzaSeguro>[]) =>
    fetchAPI<{ success: boolean; message: string; importadas: number; errores: number }>("/api/seguros/import/cobranzas", {
      method: "POST",
      token,
      body: JSON.stringify({ cobranzas }),
    }),

  siniestros: (token: string, siniestros: Partial<Siniestro>[]) =>
    fetchAPI<{ success: boolean; message: string; importados: number; errores: number }>("/api/seguros/import/siniestros", {
      method: "POST",
      token,
      body: JSON.stringify({ siniestros }),
    }),
}

// Productores Seguros API
export const productoresSegurosAPI = {
  getAll: (token: string) =>
    fetchAPI<{ success: boolean; productores: Array<{ _id: string; name: string; email: string; phone?: string; commissionRate?: number }> }>("/api/seguros/productores", { token }),
}

// Resumen Mensual Seguros API
export const resumenMensualSegurosAPI = {
  get: (token: string, mes?: string) => {
    const query = mes ? `?mes=${mes}` : ""
    return fetchAPI<{
      success: boolean
      resumen: {
        mes: string
        polizasEmitidas: number
        primaEmitida: number
        cobranzas: Record<string, unknown>
        siniestrosDelMes: number
      }
    }>(`/api/seguros/resumen-mensual${query}`, { token })
  },
}

// ── TPY Software Billing ──────────────────────────────────────────────────────
export interface TPY_SoftwareClient {
  _id: string
  name: string
  email?: string
  phone?: string
  whatsapp?: string
  crmName?: string
  plan?: string
  monthlyAmount: number
  billingDay: number
  status: "activo" | "inactivo" | "moroso"
  notes?: string
  payments: {
    _id: string
    month: string
    amount: number
    paymentDate: string
    paymentMethod: string
    notes?: string
  }[]
  createdAt: string
  updatedAt: string
  lastPayment?: { month: string; amount: number; paymentDate: string; paymentMethod: string } | null
  daysSinceLastPayment?: number | null
  paidThisMonth?: boolean
}

export interface TPY_SoftwareTransaction {
  _id: string
  type: "ingreso" | "egreso"
  category: string
  concept: string
  amount: number
  date: string
  month: string
  clientId?: string | { _id: string; name: string; crmName?: string }
  clientName?: string
  paymentMethod?: string
  recordedBy?: string | { _id: string; name: string }
  notes?: string
  createdAt: string
}

export const tpySoftwareAPI = {
  getClients: (token: string, params?: { search?: string; status?: string }) => {
    const q = new URLSearchParams()
    if (params?.search) q.set("search", params.search)
    if (params?.status) q.set("status", params.status)
    const query = q.toString() ? `?${q.toString()}` : ""
    return fetchAPI<{ success: boolean; clients: TPY_SoftwareClient[]; stats: { total: number; activos: number; morosos: number; inactivos: number; paidThisMonth: number; monthlyTotal: number } }>(`/api/tpy/software/clients${query}`, { token })
  },
  createClient: (token: string, data: Partial<TPY_SoftwareClient>) =>
    fetchAPI<{ success: boolean; client: TPY_SoftwareClient }>("/api/tpy/software/clients", { method: "POST", token, body: JSON.stringify(data) }),
  updateClient: (token: string, id: string, data: Partial<TPY_SoftwareClient>) =>
    fetchAPI<{ success: boolean; client: TPY_SoftwareClient }>(`/api/tpy/software/clients/${id}`, { method: "PUT", token, body: JSON.stringify(data) }),
  deleteClient: (token: string, id: string) =>
    fetchAPI<{ success: boolean; message: string }>(`/api/tpy/software/clients/${id}`, { method: "DELETE", token }),
  addPayment: (token: string, id: string, payment: { month: string; amount: number; paymentDate?: string; paymentMethod?: string; notes?: string; createTransaction?: boolean }) =>
    fetchAPI<{ success: boolean; client: TPY_SoftwareClient; transactionCreated: boolean }>(`/api/tpy/software/clients/${id}/payments`, { method: "POST", token, body: JSON.stringify(payment) }),
  deletePayment: (token: string, clientId: string, paymentId: string) =>
    fetchAPI<{ success: boolean }>(`/api/tpy/software/clients/${clientId}/payments/${paymentId}`, { method: "DELETE", token }),
  getTransactions: (token: string, params?: { type?: string; month?: string; clientId?: string }) => {
    const q = new URLSearchParams()
    if (params?.type) q.set("type", params.type)
    if (params?.month) q.set("month", params.month)
    if (params?.clientId) q.set("clientId", params.clientId)
    const query = q.toString() ? `?${q.toString()}` : ""
    return fetchAPI<{ success: boolean; transactions: TPY_SoftwareTransaction[]; totals: { ingresos: number; egresos: number; balance: number } }>(`/api/tpy/software/transactions${query}`, { token })
  },
  createTransaction: (token: string, data: Partial<TPY_SoftwareTransaction>) =>
    fetchAPI<{ success: boolean; transaction: TPY_SoftwareTransaction }>("/api/tpy/software/transactions", { method: "POST", token, body: JSON.stringify(data) }),
  updateTransaction: (token: string, id: string, data: Partial<TPY_SoftwareTransaction>) =>
    fetchAPI<{ success: boolean; transaction: TPY_SoftwareTransaction }>(`/api/tpy/software/transactions/${id}`, { method: "PUT", token, body: JSON.stringify(data) }),
  deleteTransaction: (token: string, id: string) =>
    fetchAPI<{ success: boolean; message: string }>(`/api/tpy/software/transactions/${id}`, { method: "DELETE", token }),
}

// ── Seguros API (produccion-compatible) ───────────────────────────────────────
export interface SegurosStats {
  totalVigentes: number
  totalAnuladas: number
  totalPendientes: number
  totalSiniestros: number
  siniestrosEnTramite: number
  porAseguradora: { _id: string; total: number }[]
  porRamo: { _id: string; total: number }[]
  emitidasEsteMes: number
  anuladasEsteMes: number
  debitoAutomatico: number
  debitoCBU: number
  debitoTarjCred: number
  vigentesEfectivo: number
  vigentesDebito: number
  totalCobranzas: number
  efectivoCobradas: number
  efectivoCuponEnviado: number
  efectivoCuotaVencida: number
  efectivoCompromisoPago: number
  efectivoNoCorresponde: number
  efectivoPendiente: number
  efectivoTotal: number
}

export interface PagoMes {
  mes: string
  mesLabel: string
  estado: "COBRADA" | "CUPON_ENVIADO" | "CUOTA_VENCIDA" | "COMPROMISO_PAGO" | "NO_CORRESPONDE" | "ANULADA" | "PENDIENTE"
  cobradoPor?: string
  fechaCobro?: string
  numeroCuota?: number | null
}

export interface EmailNotificacion {
  _id?: string
  tipo: "proximo_vencer" | "vence_hoy" | "vencido"
  mes: string
  enviadoEn: string
  estado: "enviado" | "error"
  errorMsg?: string
}

export interface CobranzaEfectivo {
  _id: string
  sucursal?: string
  diaVto?: number
  numeroCuotasTotal?: number | null
  nombreApellido: string
  email?: string
  ramo?: string
  whatsapp?: string
  aseguradora?: string
  patente?: string
  datosRiesgo?: string
  pagos: PagoMes[]
  emailNotificaciones?: EmailNotificacion[]
  createdAt: string
  updatedAt: string
}

export const segurosAPI = {
  // Dashboard
  getDashboard: (token: string, params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : ""
    return fetchAPI<{ success: boolean; stats: SegurosStats }>(`/api/seguros/dashboard${qs}`, { token })
  },

  // Pólizas
  getPolizas: (token: string, params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : ""
    return fetchAPI<{ success: boolean; polizas: Poliza[]; total: number; stats?: { vigentes: number; anuladas: number; pendientes: number } }>(`/api/seguros/polizas${qs}`, { token })
  },
  createPoliza: (token: string, data: Partial<Poliza>) =>
    fetchAPI<{ success: boolean; poliza: Poliza; cobranzaCreada?: boolean }>("/api/seguros/polizas", { method: "POST", token, body: JSON.stringify(data) }),
  updatePoliza: (token: string, id: string, data: Partial<Poliza>) =>
    fetchAPI<{ success: boolean; poliza: Poliza; cobranzaCreada?: boolean }>(`/api/seguros/polizas/${id}`, { method: "PUT", token, body: JSON.stringify(data) }),
  deletePoliza: (token: string, id: string) =>
    fetchAPI<{ success: boolean }>(`/api/seguros/polizas/${id}`, { method: "DELETE", token }),

  // Asegurados — autocompletado para nueva póliza
  buscarAsegurados: (token: string, q: string, limit = 10) =>
    fetchAPI<{
      success: boolean
      asegurados: Array<{
        nombreApellido: string
        dni?: string
        fechaNacimiento?: string
        celular?: string
        email?: string
        domicilio?: string
        localidad?: string
        cp?: string
        cantPolizas: number
      }>
    }>(`/api/seguros/asegurados/buscar?q=${encodeURIComponent(q)}&limit=${limit}`, { token }),

  // Siniestros
  getSiniestros: (token: string, params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : ""
    return fetchAPI<{ success: boolean; siniestros: Siniestro[] }>(`/api/seguros/siniestros${qs}`, { token })
  },
  createSiniestro: (token: string, data: Partial<Siniestro>) =>
    fetchAPI<{ success: boolean; siniestro: Siniestro }>("/api/seguros/siniestros", { method: "POST", token, body: JSON.stringify(data) }),
  updateSiniestro: (token: string, id: string, data: Partial<Siniestro>) =>
    fetchAPI<{ success: boolean; siniestro: Siniestro }>(`/api/seguros/siniestros/${id}`, { method: "PUT", token, body: JSON.stringify(data) }),
  deleteSiniestro: (token: string, id: string) =>
    fetchAPI<{ success: boolean }>(`/api/seguros/siniestros/${id}`, { method: "DELETE", token }),

  // Cobranzas
  getCobranzas: (token: string, params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : ""
    return fetchAPI<{ success: boolean; cobranzas: CobranzaEfectivo[] }>(`/api/seguros/cobranzas${qs}`, { token })
  },
  createCobranza: (token: string, data: Partial<CobranzaEfectivo>) =>
    fetchAPI<{ success: boolean; cobranza: CobranzaEfectivo }>("/api/seguros/cobranzas", { method: "POST", token, body: JSON.stringify(data) }),
  updateCobranza: (token: string, id: string, data: Partial<CobranzaEfectivo>) =>
    fetchAPI<{ success: boolean; cobranza: CobranzaEfectivo }>(`/api/seguros/cobranzas/${id}`, { method: "PUT", token, body: JSON.stringify(data) }),
  updatePago: (
    token: string,
    id: string,
    mes: string,
    mesLabel: string,
    estado: string,
    cobradoPor?: string,
    fechaCobro?: string,
    numeroCuota?: number | null,
    numeroCuotasTotal?: number | null,
  ) =>
    fetchAPI<{ success: boolean; cobranza: CobranzaEfectivo }>(`/api/seguros/cobranzas/${id}/pago`, {
      method: "PATCH",
      token,
      body: JSON.stringify({ mes, mesLabel, estado, cobradoPor, fechaCobro, numeroCuota, numeroCuotasTotal }),
    }),
  deleteCobranza: (token: string, id: string) =>
    fetchAPI<{ success: boolean }>(`/api/seguros/cobranzas/${id}`, { method: "DELETE", token }),

  // Sync automático de cuotas vencidas
  syncVencidas: (token: string) =>
    fetchAPI<{ success: boolean; updated: number }>("/api/seguros/cobranzas/sync-vencidas", { method: "POST", token }),

  // Cobranzas elegibles (única fuente de verdad: BE).
  getCobranzasElegibles: (token: string, mes: string) =>
    fetchAPI<{
      success: boolean
      mes: string
      proximo: CobranzaEfectivo[]
      hoy: CobranzaEfectivo[]
      vencidas: CobranzaEfectivo[]
      total: number
    }>(`/api/seguros/cobranzas/elegibles?mes=${encodeURIComponent(mes)}`, { token }),

  // Notificaciones por email
  enviarNotificacionBatch: (token: string, tipo: string, mes: string) =>
    fetchAPI<{
      success: boolean
      tipo: string
      mes: string
      results: {
        enviados: { _id: string; nombreApellido: string; email: string }[]
        fallidos: { _id: string; nombreApellido: string; email: string; error: string }[]
        sinEmail: { _id: string; nombreApellido: string }[]
        yaEnviados: { _id: string; nombreApellido: string }[]
      }
    }>("/api/seguros/cobranzas/notificaciones/enviar", {
      method: "POST",
      token,
      body: JSON.stringify({ tipo, mes }),
    }),

  enviarNotificacionIndividual: (token: string, id: string, tipo: string, mes: string) =>
    fetchAPI<{ success: boolean; cobranza: CobranzaEfectivo }>(`/api/seguros/cobranzas/${id}/notificacion`, {
      method: "POST",
      token,
      body: JSON.stringify({ tipo, mes }),
    }),

  // Email masivo a clientes de pólizas
  emailMasivoSearch: (token: string, q: string) =>
    fetchAPI<{ success: boolean; polizas: { _id: string; nombreApellido: string; email: string; estado: string; aseguradora?: string }[] }>(
      `/api/seguros/email-masivo/search?q=${encodeURIComponent(q)}`, { token }
    ),
  emailMasivoPreview: (token: string, tipo: string = "todos", ids?: string[]) => {
    const params = new URLSearchParams({ tipo })
    if (ids?.length) params.set("ids", ids.join(","))
    return fetchAPI<{ success: boolean; count: number }>(`/api/seguros/email-masivo/preview?${params}`, { token })
  },
  emailMasivo: (token: string, data: { asunto: string; mensaje: string; imagenBase64?: string; imagenMime?: string; destinatario?: string; polizaIds?: string[] }) =>
    fetchAPI<{ success: boolean; totalDestinatarios: number; enviados: number; fallidos: number }>(
      "/api/seguros/email-masivo", { method: "POST", token, body: JSON.stringify(data) }
    ),
}


// ── Branding (Personalizar) ─────────────────────────────────────────────────
export interface BrandingSettings {
  nombre?: string
  logo?: string
  colorPrimario?: string
  whatsapp?: string
  emailContacto?: string
  direccion?: string
  cuit?: string
  aseguradorasCatalogo?: string[]
  ramosCatalogo?: string[]
  mediosPagoCatalogo?: string[]
}

export const brandingAPI = {
  get: (token: string) =>
    fetchAPI<{ success: boolean; branding: BrandingSettings }>("/api/branding", { token }),
  getPublic: () =>
    fetchAPI<{ success: boolean; branding: BrandingSettings }>("/api/branding/public"),
  update: (token: string, data: Partial<BrandingSettings>) =>
    fetchAPI<{ success: boolean; branding: BrandingSettings }>("/api/branding", {
      method: "PUT", token, body: JSON.stringify(data),
    }),
  uploadLogo: (token: string, base64: string, mime: string) =>
    fetchAPI<{ success: boolean; logo: string }>("/api/branding/logo", {
      method: "POST", token, body: JSON.stringify({ base64, mime }),
    }),
}


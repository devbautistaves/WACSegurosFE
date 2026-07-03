"use client"

// WAC Seguros — WhatsApp: conectá el número del broker escaneando un QR.
// Conexión (estado / QR / cerrar / reconectar) + mensaje de prueba + historial.
// Habla con /api/whatsapp/* (proxy al whatsapp-gateway).

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { whatsappAPI, type WaStatus, type WaMessageLog, type WaPolizasConfig, type WaPolizaKey, type WaPlantilla, type WaVariable } from "@/lib/api"
import {
  MessageCircle, Smartphone, QrCode, RefreshCw, LogOut, Send,
  CheckCircle2, XCircle, Loader2, ShieldCheck, AlertTriangle, Gauge, History,
  Zap, BellRing, CalendarClock, AlarmClock, Pencil, RotateCcw, Info, Crown, Lock,
} from "lucide-react"

const WA_TRIAL_LIMIT = 25 // avisos reales gratis en el plan trial

// Íconos por tipo de aviso (la metadata —título/cuándo/plantilla— viene del BE).
const AVISO_ICON: Record<string, any> = {
  polizaProxima: BellRing, polizaVenceHoy: CalendarClock, polizaVencida: AlarmClock,
}

const ACCENT = "#0E9F6E"
const INK = "#0f172a"

const ESTADOS: Record<WaStatus, { label: string; tone: "ok" | "warn" | "bad" | "idle"; desc: string }> = {
  connected:    { label: "Conectado",      tone: "ok",   desc: "Tu WhatsApp está enlazado y listo para enviar." },
  qr_pending:   { label: "Esperando QR",   tone: "warn", desc: "Escaneá el código con tu teléfono para enlazar." },
  connecting:   { label: "Conectando…",    tone: "warn", desc: "Estableciendo la conexión con WhatsApp." },
  expired:      { label: "Sesión cerrada", tone: "bad",  desc: "Se cerró la sesión. Volvé a conectar para escanear de nuevo." },
  banned:       { label: "Bloqueado",      tone: "bad",  desc: "WhatsApp bloqueó este número." },
  disconnected: { label: "Desconectado",   tone: "idle", desc: "Todavía no conectaste ningún número." },
}
const toneStyle = (tone: string) =>
  tone === "ok"   ? { bg: "rgba(14,159,110,.12)", fg: "#0E9F6E" } :
  tone === "warn" ? { bg: "rgba(176,138,62,.14)", fg: "#9A6B16" } :
  tone === "bad"  ? { bg: "rgba(192,73,47,.12)",  fg: "#C0492F" } :
                    { bg: "rgba(15,23,42,.06)",   fg: "#5B6B63" }

export default function WhatsAppPage() {
  const [token, setToken] = useState("")
  const [status, setStatus] = useState<WaStatus>("disconnected")
  const [qr, setQr] = useState<string | null>(null)
  const [phone, setPhone] = useState<string | null>(null)
  const [lastError, setLastError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)

  const [to, setTo] = useState("")
  const [sending, setSending] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null)

  const [history, setHistory] = useState<WaMessageLog[]>([])
  const [usage, setUsage] = useState<{ enviados: number; limite: number } | null>(null)
  const [config, setConfig] = useState<WaPolizasConfig | null>(null)
  const [savingKey, setSavingKey] = useState<WaPolizaKey | null>(null)
  const [savingHorario, setSavingHorario] = useState(false)
  const [savingResumen, setSavingResumen] = useState(false)
  const [resumenMsg, setResumenMsg] = useState<{ ok: boolean; msg: string } | null>(null)

  // Plantillas editables de los avisos.
  const [plantillas, setPlantillas] = useState<WaPlantilla[]>([])
  const [variables, setVariables] = useState<WaVariable[]>([])
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [abierto, setAbierto] = useState<string | null>(null)
  const [savingTpl, setSavingTpl] = useState<string | null>(null)
  const [testingTpl, setTestingTpl] = useState<string | null>(null)
  const [tplMsg, setTplMsg] = useState<{ key: string; ok: boolean; msg: string } | null>(null)

  // Límite del plan trial: 25 avisos reales, después solo PRO.
  const [trial, setTrial] = useState<{ enTrial: boolean; usados: number; bloqueado: boolean }>({ enTrial: false, usados: 0, bloqueado: false })

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Render local del preview con datos de ejemplo (mismo SAMPLE que el BE).
  const SAMPLE: Record<string, string> = { cliente: "Juan", negocio: "Tu Broker", cobertura: "Auto (AB123CD)", fecha: "25/06/2026" }
  const previewDe = (texto: string) =>
    String(texto || "").replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => SAMPLE[k] != null ? SAMPLE[k] : "")

  const guardarPlantilla = async (configKey: string) => {
    setSavingTpl(configKey); setTplMsg(null)
    try {
      await whatsappAPI.setPlantillas(token, { [configKey]: edits[configKey] || "" })
      setPlantillas(ps => ps.map(p => p.configKey === configKey ? { ...p, custom: edits[configKey] || "", preview: previewDe(edits[configKey] || p.default) } : p))
      setTplMsg({ key: configKey, ok: true, msg: "Plantilla guardada." })
    } catch (e: any) { setTplMsg({ key: configKey, ok: false, msg: e?.message || "No se pudo guardar." }) }
    finally { setSavingTpl(null) }
  }
  const restaurarPlantilla = (a: WaPlantilla) => { setEdits(ed => ({ ...ed, [a.configKey]: a.default })) }
  const probarAviso = async (a: WaPlantilla) => {
    const num = to.trim()
    if (!num) { setTplMsg({ key: a.configKey, ok: false, msg: "Cargá tu número arriba para probar." }); return }
    setTestingTpl(a.configKey); setTplMsg(null)
    try {
      const r = await whatsappAPI.testAviso(token, a.tipo, num)
      if (r.ok) setTplMsg({ key: a.configKey, ok: true, msg: "¡Prueba enviada! Revisá tu WhatsApp." })
      else setTplMsg({ key: a.configKey, ok: false, msg: errLabel(r.error) })
      await loadHistory(token)
    } catch (e: any) { setTplMsg({ key: a.configKey, ok: false, msg: e?.message || "No se pudo enviar." }) }
    finally { setTestingTpl(null) }
  }

  useEffect(() => { setToken(localStorage.getItem("token") || "") }, [])

  const toggleAviso = async (key: WaPolizaKey, enabled: boolean) => {
    if (!config) return
    setSavingKey(key)
    setConfig({ ...config, [key]: { enabled } })
    try { const r = await whatsappAPI.setConfig(token, { [key]: { enabled } } as any); if (r.ok) setConfig(r.config) }
    catch { setConfig({ ...config, [key]: { enabled: !enabled } }) }
    finally { setSavingKey(null) }
  }

  const guardarHorario = async (desde: number, hasta: number) => {
    if (!token || !config) return
    const prev = (config as any).horarioEnvios
    setConfig({ ...config, horarioEnvios: { desde, hasta } } as any)
    setSavingHorario(true)
    try { const r = await whatsappAPI.setConfig(token, { horarioEnvios: { desde, hasta } } as any); if (r.ok) setConfig(r.config) }
    catch { setConfig({ ...config, horarioEnvios: prev } as any) }
    finally { setSavingHorario(false) }
  }

  const guardarResumen = async (enabled: boolean) => {
    if (!token || !config) return
    const prev = config
    setConfig({ ...config, resumenMultiPoliza: { enabled } } as any)
    setSavingResumen(true)
    try { const r = await whatsappAPI.setConfig(token, { resumenMultiPoliza: { enabled } } as any); if (r.ok) setConfig(r.config) }
    catch { setConfig(prev) }
    finally { setSavingResumen(false) }
  }
  const probarResumen = async () => {
    const num = to.trim()
    if (!num) { setResumenMsg({ ok: false, msg: "Cargá un número para probar." }); return }
    setSavingResumen(true); setResumenMsg(null)
    try {
      const r = await whatsappAPI.testResumen(token, num)
      if (r.ok) setResumenMsg({ ok: true, msg: "¡Resumen de prueba enviado! Revisá ese WhatsApp." })
      else setResumenMsg({ ok: false, msg: errLabel(r.error) })
      await loadHistory(token)
    } catch (e: any) { setResumenMsg({ ok: false, msg: e?.message || "No se pudo enviar." }) }
    finally { setSavingResumen(false) }
  }

  const refresh = useCallback(async (tk: string) => {
    try {
      const r = await whatsappAPI.status(tk)
      setStatus(r.status); setQr(r.qr || null); setPhone(r.phone || null); setLastError(r.lastError || null)
      return r.status
    } catch { return null }
  }, [])

  const loadHistory = useCallback(async (tk: string) => {
    try {
      const [h, u, c, p] = await Promise.all([
        whatsappAPI.history(tk), whatsappAPI.usage(tk), whatsappAPI.getConfig(tk), whatsappAPI.getPlantillas(tk),
      ])
      if (h.ok) setHistory(h.items || [])
      if (u.ok) setUsage({ enviados: u.enviados, limite: u.limite })
      if (c.ok) setConfig(c.config)
      if (p.ok) {
        setPlantillas(p.avisos); setVariables(p.variables)
        const ed: Record<string, string> = {}
        for (const a of p.avisos) ed[a.configKey] = a.custom || a.default
        setEdits(ed)
      }
      // CRM dedicado: sin paywall/trial.
      setTrial({ enTrial: false, usados: 0, bloqueado: false })
    } catch { /* silencioso */ }
  }, [])

  useEffect(() => {
    if (!token) return
    ;(async () => { await refresh(token); await loadHistory(token); setLoading(false) })()
  }, [token, refresh, loadHistory])

  useEffect(() => {
    const activo = status === "qr_pending" || status === "connecting"
    if (activo && token) {
      if (!pollRef.current) pollRef.current = setInterval(() => { refresh(token) }, 2500)
    } else if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null } }
  }, [status, token, refresh])

  const conectar = async () => {
    setActing(true); setTestResult(null)
    try { const r = await whatsappAPI.connect(token); setStatus(r.status); setQr(r.qr || null); setLastError(r.lastError || null) }
    catch (e: any) { setLastError(e?.message || "error") } finally { setActing(false) }
  }
  const reconectar = async () => {
    setActing(true); setTestResult(null)
    try { const r = await whatsappAPI.reconnect(token); setStatus(r.status); setQr(r.qr || null) }
    catch (e: any) { setLastError(e?.message || "error") } finally { setActing(false) }
  }
  const cerrar = async () => {
    if (!confirm("¿Cerrar la sesión de WhatsApp? Vas a tener que volver a escanear el QR.")) return
    setActing(true); setTestResult(null)
    try { await whatsappAPI.logout(token); setStatus("disconnected"); setQr(null); setPhone(null) }
    catch (e: any) { setLastError(e?.message || "error") } finally { setActing(false) }
  }
  const enviarPrueba = async () => {
    if (!to.trim()) return
    setSending(true); setTestResult(null)
    try {
      const r = await whatsappAPI.test(token, to.trim())
      if (r.ok) setTestResult({ ok: true, msg: "¡Mensaje enviado! Revisá ese WhatsApp." })
      else setTestResult({ ok: false, msg: errLabel(r.error) })
      await loadHistory(token)
    } catch (e: any) { setTestResult({ ok: false, msg: e?.message || "No se pudo enviar." }) }
    finally { setSending(false) }
  }

  const st = ESTADOS[status] || ESTADOS.disconnected
  const tone = toneStyle(st.tone)
  const isConnected = status === "connected"
  const resumenOn = (config as any)?.resumenMultiPoliza?.enabled !== false

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto px-1 py-2">
        <div className="flex items-start gap-3 mb-6">
          <div className="h-11 w-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: ACCENT }}>
            <MessageCircle className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: INK }}>WhatsApp</h1>
            <p className="text-sm text-slate-500 mt-0.5">Conectá el WhatsApp del broker para enviar avisos de vencimiento y recordatorios.</p>
          </div>
        </div>

        {/* Paywall del plan trial: bloqueado al llegar a 25 avisos reales */}
        {trial.bloqueado && (
          <div className="rounded-2xl border mb-5 px-5 py-4 flex items-start gap-3" style={{ background: "rgba(176,138,62,.08)", borderColor: "rgba(176,138,62,.3)" }}>
            <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(176,138,62,.16)" }}>
              <Lock className="h-5 w-5" style={{ color: "#9A6B16" }} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-sm" style={{ color: INK }}>Llegaste a los {WA_TRIAL_LIMIT} avisos de WhatsApp de la prueba</p>
              <p className="text-xs text-slate-500 mt-0.5">Para seguir enviando avisos automáticos a tus asegurados, suscribite al plan PRO. Tu número y tus mensajes quedan guardados.</p>
              <Link href="/admin/suscripcion" className="inline-flex items-center gap-1.5 mt-2.5 px-3.5 py-2 rounded-lg text-white text-xs font-semibold" style={{ background: ACCENT }}>
                <Crown className="h-3.5 w-3.5" /> Suscribirme a PRO
              </Link>
            </div>
          </div>
        )}
        {/* Aviso de cupo cerca del límite */}
        {!trial.bloqueado && trial.enTrial && (
          <div className="rounded-xl border mb-5 px-4 py-2.5 flex items-center gap-2 text-xs" style={{ background: "rgba(14,159,110,.05)", borderColor: "rgba(14,159,110,.2)" }}>
            <Info className="h-3.5 w-3.5 flex-shrink-0" style={{ color: ACCENT }} />
            <span className="text-slate-600">Plan de prueba: llevás <strong>{trial.usados}/{WA_TRIAL_LIMIT}</strong> avisos enviados. Al llegar a {WA_TRIAL_LIMIT} se pausa hasta que pases a PRO.</span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-slate-400 py-16 justify-center"><Loader2 className="h-5 w-5 animate-spin" /> Cargando estado…</div>
        ) : (
          <>
            <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #eef1ee" }}>
                <div className="flex items-center gap-3">
                  <Smartphone className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-slate-400">Estado de conexión</p>
                    <span className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: tone.bg, color: tone.fg }}>
                      {st.tone === "ok" && <CheckCircle2 className="h-3.5 w-3.5" />}
                      {st.tone === "warn" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      {st.tone === "bad" && <XCircle className="h-3.5 w-3.5" />}
                      {st.label}
                    </span>
                  </div>
                </div>
                {phone && isConnected && (
                  <div className="text-right">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-slate-400">Número</p>
                    <p className="font-mono text-sm font-semibold" style={{ color: INK }}>+{phone}</p>
                  </div>
                )}
              </div>

              <div className="px-5 py-5">
                <p className="text-sm text-slate-600 mb-4">{st.desc}</p>

                {(status === "qr_pending" || (status === "connecting" && qr)) && qr && (
                  <div className="flex flex-col items-center gap-3 py-2">
                    <div className="p-3 rounded-2xl border bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={qr} alt="QR de WhatsApp" className="h-60 w-60" />
                    </div>
                    <ol className="text-xs text-slate-500 space-y-1 max-w-xs">
                      <li>1. Abrí <strong>WhatsApp</strong> en tu teléfono.</li>
                      <li>2. Tocá <strong>Ajustes → Dispositivos vinculados</strong>.</li>
                      <li>3. <strong>Vincular un dispositivo</strong> y escaneá este código.</li>
                    </ol>
                    <p className="flex items-center gap-1.5 text-[11px] text-slate-400"><RefreshCw className="h-3 w-3 animate-spin" /> El código se actualiza solo…</p>
                  </div>
                )}

                {status === "connecting" && !qr && (
                  <div className="flex items-center justify-center gap-2 text-slate-400 py-8"><Loader2 className="h-5 w-5 animate-spin" /> Generando código…</div>
                )}

                {isConnected && (
                  <div className="flex items-center gap-2 rounded-xl px-4 py-3" style={{ background: "rgba(14,159,110,.08)" }}>
                    <ShieldCheck className="h-5 w-5" style={{ color: ACCENT }} />
                    <p className="text-sm" style={{ color: "#0b6b4a" }}>Tu número está enlazado. Mantené el teléfono con internet para que siga conectado.</p>
                  </div>
                )}

                {lastError && status !== "connected" && status !== "qr_pending" && (
                  <div className="flex items-center gap-2 text-xs text-amber-700 mt-3"><AlertTriangle className="h-3.5 w-3.5" /> Detalle técnico: {lastError}</div>
                )}

                <div className="flex flex-wrap gap-2 mt-5">
                  {!isConnected && status !== "qr_pending" && status !== "connecting" && (
                    <button onClick={conectar} disabled={acting} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60" style={{ background: ACCENT }}>
                      {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />} Conectar WhatsApp
                    </button>
                  )}
                  {(status === "qr_pending" || status === "connecting") && (
                    <button onClick={reconectar} disabled={acting} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border text-slate-600 disabled:opacity-60">
                      <RefreshCw className={`h-4 w-4 ${acting ? "animate-spin" : ""}`} /> Generar nuevo QR
                    </button>
                  )}
                  {isConnected && (
                    <button onClick={reconectar} disabled={acting} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border text-slate-600 disabled:opacity-60">
                      <RefreshCw className={`h-4 w-4 ${acting ? "animate-spin" : ""}`} /> Reconectar
                    </button>
                  )}
                  {(isConnected || status === "qr_pending" || status === "connecting" || status === "expired") && (
                    <button onClick={cerrar} disabled={acting} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-red-200 text-red-600 disabled:opacity-60">
                      <LogOut className="h-4 w-4" /> Cerrar sesión
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Horario de mensajes automáticos */}
            <div className="rounded-2xl border bg-white shadow-sm mt-5 px-5 py-5">
              <div className="flex items-center gap-2 mb-1"><AlarmClock className="h-4 w-4 text-slate-400" /><h2 className="font-bold text-lg" style={{ color: INK }}>Horario de mensajes automáticos</h2></div>
              <p className="text-sm text-slate-500 mb-3">Tus clientes solo reciben avisos automáticos por WhatsApp dentro de esta franja. Fuera de ese horario el aviso espera y se manda cuando abre.</p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-slate-600">Enviar entre las</span>
                <select value={(config as any)?.horarioEnvios?.desde ?? 9} onChange={(e) => guardarHorario(Number(e.target.value), (config as any)?.horarioEnvios?.hasta ?? 21)} disabled={savingHorario}
                  className="px-2.5 py-1.5 rounded-lg border text-sm outline-none focus:ring-2" style={{ ["--tw-ring-color" as any]: ACCENT }}>
                  {Array.from({ length: 24 }, (_, i) => i).map((h) => <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>)}
                </select>
                <span className="text-sm text-slate-600">y las</span>
                <select value={(config as any)?.horarioEnvios?.hasta ?? 21} onChange={(e) => guardarHorario((config as any)?.horarioEnvios?.desde ?? 9, Number(e.target.value))} disabled={savingHorario}
                  className="px-2.5 py-1.5 rounded-lg border text-sm outline-none focus:ring-2" style={{ ["--tw-ring-color" as any]: ACCENT }}>
                  {Array.from({ length: 24 }, (_, i) => i + 1).map((h) => <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>)}
                </select>
                {savingHorario && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
              </div>
            </div>

            {/* Resumen para clientes con varias pólizas */}
            <div className="rounded-2xl border bg-white shadow-sm mt-5 px-5 py-5">
              <div className="flex items-start justify-between gap-3 mb-1">
                <div className="flex items-center gap-2"><MessageCircle className="h-4 w-4 text-slate-400" /><h2 className="font-bold text-lg" style={{ color: INK }}>Resumen para clientes con varias pólizas</h2></div>
                <button onClick={() => !savingResumen && guardarResumen(!resumenOn)} disabled={savingResumen} aria-label="Resumen de varias pólizas"
                  className="relative h-6 w-11 rounded-full flex-shrink-0 transition-colors mt-0.5" style={{ background: resumenOn ? ACCENT : "#cbd5e1" }}>
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${resumenOn ? "left-[22px]" : "left-0.5"}`} />
                </button>
              </div>
              <p className="text-sm text-slate-500 mb-3">Cuando un cliente tiene <strong>varias pólizas</strong>, en vez de un WhatsApp por cada una recibe <strong>un solo mensaje</strong> con el resumen de todos sus vencimientos. Así no lo saturás y cuenta como un envío. {resumenOn ? "Está activo." : "Está desactivado: se manda un mensaje por póliza."}</p>
              <p className="text-xs font-semibold text-slate-400 mb-1.5">Así lo recibe el cliente:</p>
              <div className="rounded-lg p-2.5 text-[13px] text-slate-700 whitespace-pre-wrap" style={{ background: "#e7f7ee", border: "1px solid rgba(14,159,110,.18)" }}>
{`Hola Juan 👋
Te recordamos el vencimiento de tus pólizas:

• Auto (AB123CD): vence el 25/06/2026
• Hogar: vence el 28/06/2026
• Vida: venció el 20/06/2026, hay que renovar

Escribinos para renovar o consultar ✅`}
              </div>
              <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center mt-3">
                <input value={to} onChange={(e) => setTo(e.target.value)} disabled={!isConnected} placeholder="Ej: 11 2345 6789"
                  className="flex-1 px-3 py-2 rounded-lg border text-sm disabled:bg-slate-50 disabled:text-slate-400 outline-none focus:ring-2" style={{ ["--tw-ring-color" as any]: ACCENT }} />
                <button onClick={probarResumen} disabled={!isConnected || savingResumen || !to.trim() || trial.bloqueado} className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg text-white disabled:opacity-50 whitespace-nowrap" style={{ background: ACCENT }}>
                  {savingResumen ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Enviar resumen de prueba
                </button>
              </div>
              {resumenMsg && (
                <div className={`text-xs flex items-center gap-1 mt-2 ${resumenMsg.ok ? "text-emerald-700" : "text-red-600"}`}>
                  {resumenMsg.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />} {resumenMsg.msg}
                </div>
              )}
              {!isConnected && <p className="text-[11px] text-slate-400 mt-1">Conectá WhatsApp primero para poder probar.</p>}
            </div>

            {/* Avisos de póliza automáticos — con plantilla editable y prueba */}
            <div className="rounded-2xl border bg-white shadow-sm mt-5 px-5 py-5">
              <div className="flex items-center gap-2 mb-1"><Zap className="h-4 w-4 text-slate-400" /><h2 className="font-bold text-lg" style={{ color: INK }}>Avisos de vencimiento de póliza</h2></div>
              <p className="text-sm text-slate-500 mb-3">
                Recordatorios automáticos de renovación a tus asegurados, según la fecha de fin de vigencia. Podés <strong>editar cada mensaje</strong> y <strong>probarlo</strong> en tu número.
              </p>

              {/* Número para probar los avisos */}
              <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center mb-4 p-3 rounded-xl" style={{ background: "rgba(14,159,110,.04)" }}>
                <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5"><Send className="h-3.5 w-3.5" /> Probar en mi número:</span>
                <input value={to} onChange={(e) => setTo(e.target.value)} disabled={!isConnected} placeholder="Ej: 11 2345 6789"
                  className="flex-1 px-3 py-2 rounded-lg border text-sm disabled:bg-slate-50 disabled:text-slate-400 outline-none focus:ring-2"
                  style={{ ["--tw-ring-color" as any]: ACCENT }} />
                {!isConnected && <span className="text-[11px] text-slate-400">Conectá WhatsApp primero.</span>}
              </div>

              <div className="space-y-3">
                {plantillas.map((a) => {
                  const Icon = AVISO_ICON[a.configKey] || BellRing
                  const on = !!config?.[a.configKey as WaPolizaKey]?.enabled
                  const saving = savingKey === (a.configKey as WaPolizaKey)
                  const open = abierto === a.configKey
                  const texto = edits[a.configKey] ?? (a.custom || a.default)
                  const cambiado = texto !== (a.custom || a.default)
                  return (
                    <div key={a.configKey} className="rounded-xl border" style={{ borderColor: "#eef1ee" }}>
                      {/* Cabecera: ícono, título, cuándo, toggle */}
                      <div className="flex items-start gap-3 p-3">
                        <div className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(14,159,110,.10)" }}>
                          <Icon className="h-4.5 w-4.5" style={{ color: ACCENT }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-700">{a.label}</p>
                          <p className="text-xs text-slate-500 flex items-start gap-1 mt-0.5">
                            <Info className="h-3 w-3 mt-0.5 flex-shrink-0 text-slate-400" />
                            <span>{a.cuando}{a.configKey === "polizaProxima" && config ? ` Hoy: ${config.diasProximo} días antes.` : ""}</span>
                          </p>
                        </div>
                        <button onClick={() => !saving && toggleAviso(a.configKey as WaPolizaKey, !on)} disabled={saving} aria-label={a.label}
                          className="relative h-6 w-11 rounded-full flex-shrink-0 transition-colors mt-0.5" style={{ background: on ? ACCENT : "#cbd5e1" }}>
                          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
                        </button>
                      </div>

                      {/* Preview del mensaje + acciones */}
                      <div className="px-3 pb-3">
                        <div className="rounded-lg p-2.5 text-[13px] text-slate-700 whitespace-pre-wrap" style={{ background: "#e7f7ee", border: "1px solid rgba(14,159,110,.18)" }}>
                          {previewDe(texto)}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <button onClick={() => setAbierto(open ? null : a.configKey)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 px-2.5 py-1.5 rounded-lg border hover:bg-slate-50">
                            <Pencil className="h-3.5 w-3.5" /> {open ? "Cerrar" : "Editar mensaje"}
                          </button>
                          <button onClick={() => probarAviso(a)} disabled={!isConnected || testingTpl === a.configKey || trial.bloqueado} className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg text-white disabled:opacity-50" style={{ background: ACCENT }}>
                            {testingTpl === a.configKey ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Probar
                          </button>
                          {tplMsg && tplMsg.key === a.configKey && (
                            <span className={`text-xs flex items-center gap-1 ${tplMsg.ok ? "text-emerald-700" : "text-red-600"}`}>
                              {tplMsg.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />} {tplMsg.msg}
                            </span>
                          )}
                        </div>

                        {/* Editor */}
                        {open && (
                          <div className="mt-3 rounded-lg p-3" style={{ background: "rgba(14,159,110,.04)" }}>
                            <textarea value={texto} onChange={(e) => setEdits(ed => ({ ...ed, [a.configKey]: e.target.value }))}
                              rows={3} className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 resize-y" style={{ ["--tw-ring-color" as any]: ACCENT }} />
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              <span className="text-[11px] text-slate-400 mr-1">Insertá:</span>
                              {variables.map(v => (
                                <button key={v.tag} title={v.desc} onClick={() => setEdits(ed => ({ ...ed, [a.configKey]: (ed[a.configKey] ?? texto) + " " + v.tag }))}
                                  className="text-[11px] font-mono px-1.5 py-0.5 rounded border bg-white hover:bg-slate-50 text-slate-600">{v.tag}</button>
                              ))}
                            </div>
                            <div className="flex flex-wrap gap-2 mt-3">
                              <button onClick={() => guardarPlantilla(a.configKey)} disabled={savingTpl === a.configKey || !cambiado} className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white disabled:opacity-50" style={{ background: INK }}>
                                {savingTpl === a.configKey ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Guardar mensaje
                              </button>
                              <button onClick={() => restaurarPlantilla(a)} className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border text-slate-600 hover:bg-slate-50">
                                <RotateCcw className="h-3.5 w-3.5" /> Volver al texto por defecto
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Mensaje de prueba */}
            <div className="rounded-2xl border bg-white shadow-sm mt-5 px-5 py-5">
              <div className="flex items-center gap-2 mb-1"><Send className="h-4 w-4 text-slate-400" /><h2 className="font-bold text-lg" style={{ color: INK }}>Mensaje de prueba</h2></div>
              <p className="text-sm text-slate-500 mb-4">Enviá un mensaje a tu propio número para confirmar que todo funciona.</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input value={to} onChange={(e) => setTo(e.target.value)} disabled={!isConnected || sending} placeholder="Ej: 11 2345 6789"
                  className="flex-1 px-3.5 py-2.5 rounded-xl border text-sm disabled:bg-slate-50 disabled:text-slate-400 outline-none focus:ring-2"
                  style={{ ["--tw-ring-color" as any]: ACCENT }} />
                <button onClick={enviarPrueba} disabled={!isConnected || sending || !to.trim() || trial.bloqueado} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50" style={{ background: ACCENT }}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Enviar
                </button>
              </div>
              {!isConnected && <p className="text-xs text-slate-400 mt-2">Conectá tu WhatsApp primero para poder enviar.</p>}
              {testResult && (
                <div className={`flex items-center gap-2 text-sm mt-3 ${testResult.ok ? "text-emerald-700" : "text-red-600"}`}>
                  {testResult.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />} {testResult.msg}
                </div>
              )}
            </div>

            <div className="rounded-2xl border bg-white shadow-sm mt-5 px-5 py-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2"><History className="h-4 w-4 text-slate-400" /><h2 className="font-bold text-lg" style={{ color: INK }}>Historial de envíos</h2></div>
                {usage && (
                  <div className="flex items-center gap-2 text-xs text-slate-500"><Gauge className="h-3.5 w-3.5" /><span className="font-mono">{usage.enviados}/{usage.limite}</span><span className="hidden sm:inline">en los últimos 15 min</span></div>
                )}
              </div>
              {usage && (
                <div className="h-1.5 w-full rounded-full bg-slate-100 mb-4 overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (usage.enviados / usage.limite) * 100)}%`, background: usage.enviados >= usage.limite ? "#C0492F" : ACCENT }} />
                </div>
              )}
              {history.length === 0 ? (
                <p className="text-sm text-slate-400 py-4 text-center">Todavía no enviaste mensajes.</p>
              ) : (
                <div className="divide-y">
                  {history.map((m, i) => (
                    <div key={i} className="flex items-center gap-3 py-2.5 text-sm">
                      <span className="flex-shrink-0">{m.status === "sent" ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-red-500" />}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-xs text-slate-600 truncate">{m.to}</p>
                        <p className="text-slate-500 text-xs truncate">{m.body}</p>
                      </div>
                      <span className="flex-shrink-0 text-[10px] uppercase tracking-wide font-mono text-slate-400">{m.origin}</span>
                      <span className="flex-shrink-0 text-[11px] text-slate-400">{new Date(m.createdAt).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <p className="text-[11px] text-slate-400 mt-4 leading-relaxed">
              Usá esta conexión solo para escribirles a tus propios clientes. Enviar mensajes masivos o a contactos que no te
              conocen puede hacer que WhatsApp bloquee tu número. Por seguridad, el sistema limita los envíos a {usage?.limite ?? 50} cada 15 minutos.
            </p>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

function errLabel(err?: string) {
  if (err === "no_session") return "No hay sesión conectada. Reconectá e intentá de nuevo."
  if (err === "not_on_whatsapp") return "Ese número no tiene WhatsApp (revisá el formato)."
  if (err === "missing_to") return "Ingresá un número."
  return err || "No se pudo enviar el mensaje."
}

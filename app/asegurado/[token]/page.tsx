"use client"

// Legajo público del asegurado — lo comparte el PAS por link/QR con su cliente.
// Una pieza POR CLIENTE (agrupa sus pólizas y siniestros). Diseño "legajo
// digital": tapa institucional con el color del productor, y debajo un layout
// de dos columnas en escritorio — pólizas como tarjetas tipo cédula (todos los
// datos: compañía, N° póliza, vigencia, medio de pago, riesgo/vehículo) con sus
// cuotas y siniestros adentro, y una columna lateral con Cómo pagar + teléfonos
// de las compañías + contacto del productor. Iconos SVG inline (sin CDN).

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import {
  legajoAseguradoAPI, LegajoPublico, LegajoCobranza, LegajoPago,
  LegajoVehiculo, LegajoSiniestro,
} from "@/lib/api"

const moneyAR = (n?: number | null) => (n == null ? "" : "$" + Number(n).toLocaleString("es-AR"))
const dateAR = (d?: string | null, long = false) =>
  d ? new Date(d).toLocaleDateString("es-AR", long
    ? { day: "2-digit", month: "long", year: "numeric" }
    : { day: "2-digit", month: "2-digit", year: "2-digit" }) : ""

const RAMOS_VEHICULO = ["AUTOS", "MOTOS", "REMISES", "TRANSPORTE_CARGAS", "FLOTA_AUTOMOTOR"]
const TITLE = (s?: string) => (s || "").replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
const labelRamo = TITLE
const labelCompania = TITLE
const firstName = (s?: string) => (s || "").trim().split(/\s+/)[0] || ""

const MEDIO_PAGO: Record<string, string> = {
  TARJ_CRED: "Tarjeta de crédito", CBU: "Débito por CBU", EFECTIVO: "Efectivo",
  CUPON: "Cupón de pago", OTRO: "Otro medio",
}
const ESTADO_POLIZA: Record<string, string> = {
  VIGENTE: "Vigente", A_RENOVAR: "A renovar", NO_VIGENTE: "No vigente",
  ANULADA: "Anulada", PENDIENTE_CLIENTE: "Pendiente",
}
const TIPO_SINIESTRO: Record<string, string> = {
  ROBO_TOTAL: "Robo total", ROBO_PARCIAL: "Robo parcial", DAÑO_TOTAL: "Daño total",
  CHOQUE_ACCIDENTE: "Choque / accidente", CRISTALES: "Cristales", INCENDIO: "Incendio",
  GRANIZO: "Granizo", OTRO: "Siniestro",
}
const ESTADO_SINIESTRO: Record<string, { label: string; tone: string }> = {
  DENUNCIADO:    { label: "Denunciado", tone: "next" },
  EN_ANALISIS:   { label: "En análisis", tone: "wait" },
  PERITAJE:      { label: "Peritaje / inspección", tone: "wait" },
  EN_REPARACION: { label: "En reparación / gestión", tone: "wait" },
  A_INDEMNIZAR:  { label: "A indemnizar / cobrar", tone: "next" },
  FINALIZADO:    { label: "Finalizado", tone: "ok" },
  RECHAZADO:     { label: "Rechazado", tone: "mora" },
  EN_TRAMITE:    { label: "En trámite", tone: "wait" },
}
// Pasos del seguimiento que ve el cliente (en orden). RECHAZADO es terminal aparte.
const SINIESTRO_PASOS: { key: string; label: string }[] = [
  { key: "DENUNCIADO", label: "Denunciado" },
  { key: "EN_ANALISIS", label: "En análisis" },
  { key: "PERITAJE", label: "Peritaje" },
  { key: "EN_REPARACION", label: "En gestión" },
  { key: "A_INDEMNIZAR", label: "A cobrar" },
  { key: "FINALIZADO", label: "Finalizado" },
]
// Índice del paso actual. EN_TRAMITE (legacy) cae en "En análisis".
function pasoActual(estado?: string): number {
  if (estado === "EN_TRAMITE") return 1
  const i = SINIESTRO_PASOS.findIndex(p => p.key === estado)
  return i >= 0 ? i : 0
}

// ── Iconos SVG inline (stroke = currentColor) ─────────────────────────────────
const P: Record<string, React.ReactNode> = {
  shield: <><path d="M12 3l7 3v5c0 4.2-2.8 7.4-7 9-4.2-1.6-7-4.8-7-9V6l7-3z" /><path d="M9.2 12l2 2 3.6-4" /></>,
  car: <><path d="M5 11l1.5-4.2A2 2 0 0 1 8.4 5.5h7.2a2 2 0 0 1 1.9 1.3L19 11" /><path d="M4 11h16v5H4z" /><circle cx="7.5" cy="16.5" r="1.4" /><circle cx="16.5" cy="16.5" r="1.4" /></>,
  motorbike: <><circle cx="5.5" cy="16.5" r="2.6" /><circle cx="18.5" cy="16.5" r="2.6" /><path d="M8 16.5h6l3-5h-4l-2-3H8" /><path d="M14 8.5h3" /></>,
  truck: <><path d="M3 7h11v9H3z" /><path d="M14 10h4l3 3v3h-7z" /><circle cx="7" cy="17" r="1.6" /><circle cx="17.5" cy="17" r="1.6" /></>,
  home: <><path d="M4 11l8-6 8 6" /><path d="M6 10v9h12v-9" /></>,
  heart: <path d="M12 20s-7-4.4-7-9.3A3.7 3.7 0 0 1 12 8a3.7 3.7 0 0 1 7 2.7C19 15.6 12 20 12 20z" />,
  store: <><path d="M4 9l1-4h14l1 4" /><path d="M5 9v10h14V9" /><path d="M9 19v-5h6v5" /></>,
  receipt: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6" /></>,
  phone: <path d="M6.5 4h-1A2 2 0 0 0 3.5 6 16 16 0 0 0 18 20.5a2 2 0 0 0 2-2v-1.2c0-.6-.4-1.1-1-1.3l-3-.9c-.6-.2-1.2 0-1.6.5l-.8 1.1a12 12 0 0 1-4.6-4.6l1.1-.8c.5-.4.7-1 .5-1.6l-.9-3c-.2-.6-.7-1-1.3-1z" />,
  whatsapp: <path d="M12 4a8 8 0 0 0-6.9 12L4 20l4.2-1.1A8 8 0 1 0 12 4zm0 2a6 6 0 1 1-3.2 11l-.3-.2-2 .5.5-1.9-.2-.3A6 6 0 0 1 12 6zm-2 3c-.2 0-.5.1-.7.4-.3.3-.8.8-.8 1.9s.8 2.2.9 2.4c.2.2 1.6 2.5 4 3.4 1.9.7 2.3.6 2.7.5.4 0 1.3-.5 1.5-1.1.2-.5.2-1 .1-1.1l-.6-.3-1.5-.7c-.2 0-.4-.1-.5.1l-.7.9c-.1.1-.3.2-.5.1-.7-.3-1.4-.6-2.1-1.5-.2-.3 0-.4.1-.6l.4-.5c.1-.2.1-.3 0-.5l-.7-1.6c-.1-.3-.3-.3-.4-.3h-.5z" />,
  copy: <><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h8" /></>,
  check: <path d="M5 12.5l4 4 10-10" />,
  card: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18" /></>,
  bank: <><path d="M4 9l8-5 8 5" /><path d="M5 9v9h14V9" /><path d="M9 18v-6M12 18v-6M15 18v-6" /></>,
  alert: <><path d="M12 4l9 16H3z" /><path d="M12 10v4M12 17v.5" /></>,
  world: <><circle cx="12" cy="12" r="8" /><path d="M4 12h16M12 4c2.5 2 2.5 14 0 16M12 4c-2.5 2-2.5 14 0 16" /></>,
  mobile: <><rect x="7" y="3" width="10" height="18" rx="2" /><path d="M11 18h2" /></>,
  camera: <><path d="M4 8h3l1.5-2h7L17 8h3v11H4z" /><circle cx="12" cy="13" r="3.2" /></>,
  folderx: <><path d="M4 7a2 2 0 0 1 2-2h3l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" /><path d="M10 11l4 4M14 11l-4 4" /></>,
  arrow: <path d="M12 5v14M6 13l6 6 6-6" />,
  calendar: <><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M4 9h16M8 3v4M16 3v4" /></>,
  hash: <path d="M9 4l-1 16M16 4l-1 16M4 9h16M3 15h16" />,
  triangle: <><path d="M12 4l9 16H3z" /><path d="M12 10v4M12 17v.5" /></>,
}
function Ic({ n, s = 20, w = 1.7 }: { n: string; s?: number; w?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flexShrink: 0 }}>
      {P[n] || P.shield}
    </svg>
  )
}
const iconRamo = (r?: string) => {
  if (!r) return "shield"
  if (r.includes("MOTO")) return "motorbike"
  if (r.includes("TRANSPORTE") || r.includes("FLOTA")) return "truck"
  if (r.includes("HOGAR")) return "home"
  if (r.includes("VIDA") || r.includes("ACC")) return "heart"
  if (r.includes("INCEND") || r.includes("COMERC")) return "store"
  if (RAMOS_VEHICULO.some(x => r.includes(x))) return "car"
  return "shield"
}
const esVehiculoRamo = (v: LegajoVehiculo) => !!v.patente && RAMOS_VEHICULO.some(r => (v.ramo || "").includes(r))

function estadoChip(p: LegajoPago): { label: string; tone: "ok" | "mora" | "next" | "wait" | "neutral" } {
  if (p.estado === "COBRADA") return { label: "Pagada", tone: "ok" }
  if (p.estado === "COMPROBANTE_RECIBIDO") return { label: "En revisión", tone: "wait" }
  if (p.estado === "CUOTA_VENCIDA") return { label: "Vencida", tone: "mora" }
  if (p.estado === "NO_CORRESPONDE" || p.estado === "ANULADA") return { label: "—", tone: "neutral" }
  return { label: "Por pagar", tone: "next" }
}
const TONES: Record<string, React.CSSProperties> = {
  ok:      { background: "#E2F4ED", color: "#0A5440", border: "1px solid #1C8C6C" },
  mora:    { background: "#FBEAE7", color: "#8C2A18", border: "1px solid #C8503A" },
  next:    { background: "#FBF0DC", color: "#7A4A0C", border: "1px solid #C99526" },
  wait:    { background: "#ECE9F7", color: "#3A2F73", border: "1px solid #6E63C2" },
  neutral: { background: "#EFEDE6", color: "#4A4A45", border: "1px solid #9A9890" },
}

async function fileToDataUrl(file: File): Promise<string> {
  if (file.type === "application/pdf") {
    return new Promise((resolve, reject) => {
      const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.onerror = () => reject(r.error); r.readAsDataURL(file)
    })
  }
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image(); i.onload = () => resolve(i); i.onerror = reject; i.src = URL.createObjectURL(file)
  })
  const MAX = 1200; let w = img.naturalWidth, h = img.naturalHeight
  if (w > MAX || h > MAX) { const k = MAX / Math.max(w, h); w = Math.round(w * k); h = Math.round(h * k) }
  const c = document.createElement("canvas"); c.width = w; c.height = h
  const ctx = c.getContext("2d")!; ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h); ctx.drawImage(img, 0, 0, w, h)
  return c.toDataURL("image/jpeg", 0.82)
}

// Mezcla un color hex con negro para derivar la tapa oscura desde el acento.
function darken(hex: string, amt = 0.62): string {
  const m = /^#?([\da-f]{6})$/i.exec(hex || ""); if (!m) return "#0E2A22"
  const n = parseInt(m[1], 16); const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  const d = (x: number) => Math.round(x * (1 - amt))
  return `rgb(${d(r)},${d(g)},${d(b)})`
}

type Msg = { key: string; text: string; tone: "ok" | "err" } | null

// Una póliza con sus cobranzas y siniestros ya agrupados.
type PolizaGroup = { poliza: LegajoVehiculo; cobranzas: LegajoCobranza[]; siniestros: LegajoSiniestro[] }

export default function AseguradoLegajoPage() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<LegajoPublico | null>(null)
  const [estado, setEstado] = useState<"load" | "ok" | "err">("load")
  const [subiendo, setSubiendo] = useState<string | null>(null)
  const [msg, setMsg] = useState<Msg>(null)
  const [copiado, setCopiado] = useState<string | null>(null)

  useEffect(() => {
    legajoAseguradoAPI.publico(token)
      .then(d => { setData(d); setEstado("ok") })
      .catch(() => setEstado("err"))
  }, [token])

  const accent = data?.productor?.colorPrimario || "#1F6B4F"
  const cover = darken(accent, 0.66)
  const wa = data?.productor?.whatsapp ? String(data.productor.whatsapp).replace(/[^0-9]/g, "") : ""
  const inicial = (data?.productor?.nombre || "P").trim().charAt(0).toUpperCase()
  const companias = useMemo(() => (data?.companias || []).filter(c => c.telefonoAuxilio || c.telefonoSiniestros || c.appUrl || c.sitioWeb), [data])
  const pago = data?.productor?.datosCobro || null

  // Agrupamos por póliza: cada póliza junta sus cobranzas (por polizaId) y sus
  // siniestros (por polizaId o por numPoliza). Lo que no matchea va a "sueltos".
  const { grupos, cobranzasSueltas, siniestrosSueltos } = useMemo(() => {
    const polizas = data?.vehiculos || []
    const cobr = data?.cuentaCorriente || []
    const sin = data?.siniestros || []
    const usadasCob = new Set<string>(), usadosSin = new Set<string>()
    const grupos: PolizaGroup[] = polizas.map(p => {
      const cobranzas = cobr.filter(c => c.polizaId && c.polizaId === p._id)
      cobranzas.forEach(c => usadasCob.add(c._id))
      const siniestros = sin.filter(s =>
        (s.polizaId && s.polizaId === p._id) ||
        (!!s.numPoliza && !!p.numPoliza && s.numPoliza === p.numPoliza))
      siniestros.forEach(s => usadosSin.add(s._id))
      return { poliza: p, cobranzas, siniestros }
    })
    return {
      grupos,
      cobranzasSueltas: cobr.filter(c => !usadasCob.has(c._id)),
      siniestrosSueltos: sin.filter(s => !usadosSin.has(s._id)),
    }
  }, [data])

  // Resumen para la tapa.
  const resumen = useMemo(() => {
    const total = data?.vehiculos?.length || 0
    const vigentes = (data?.vehiculos || []).filter(v => v.estado === "VIGENTE").length
    return { total, vigentes }
  }, [data])

  // Próxima acción: la primera cuota impaga de todas las cobranzas.
  const pendiente = useMemo(() => {
    for (const cob of data?.cuentaCorriente || []) {
      const p = cob.pagos.find(x => x.estado === "CUOTA_VENCIDA")
        || cob.pagos.find(x => x.estado !== "COBRADA" && x.estado !== "COMPROBANTE_RECIBIDO" && x.estado !== "NO_CORRESPONDE" && x.estado !== "ANULADA")
      if (p) return { cob, pago: p, vencida: p.estado === "CUOTA_VENCIDA" }
    }
    return null
  }, [data])

  const copiar = (label: string, value: string) => {
    navigator.clipboard?.writeText(value); setCopiado(label); setTimeout(() => setCopiado(null), 1600)
  }

  async function handleUpload(cobranzaId: string, mes: string, file: File) {
    const key = `${cobranzaId}:${mes}`; setSubiendo(key); setMsg(null)
    try {
      const dataUrl = await fileToDataUrl(file)
      await legajoAseguradoAPI.subirComprobante(token, { cobranzaId, mes, dataUrl })
      setMsg({ key, text: "¡Listo! Recibimos tu comprobante. Te avisamos cuando lo confirmemos.", tone: "ok" })
      const d = await legajoAseguradoAPI.publico(token); setData(d)
    } catch (e: any) {
      setMsg({ key, text: e?.message || "No se pudo enviar el comprobante.", tone: "err" })
    } finally { setSubiendo(null) }
  }

  return (
    <main className="leg-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700&family=Manrope:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        .leg-root{ --acc:${accent}; --cover:${cover}; --paper:#F6F3EB; --surf:#FFFFFF; --ink:#13201A; --muted:#5E6B63;
          --line:#E7E2D4; --mora:#C8503A; --gold:#C99526;
          background:var(--paper); color:var(--ink); min-height:100vh;
          font-family:'Manrope',ui-sans-serif,system-ui,sans-serif; -webkit-font-smoothing:antialiased; }
        .leg-mono{ font-family:'IBM Plex Mono',ui-monospace,monospace; font-variant-numeric:tabular-nums; }
        .leg-display{ font-family:'Bricolage Grotesque','Manrope',sans-serif; font-weight:600; letter-spacing:-.015em; }
        .leg-eye{ font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.2em; text-transform:uppercase; color:var(--muted); }
        /* Tapa institucional */
        .leg-cover{ background:linear-gradient(165deg, var(--acc), var(--cover)); color:#fff; padding:30px 0 96px;
          position:relative; overflow:hidden; }
        .leg-cover::after{ content:""; position:absolute; inset:0; opacity:.10;
          background-image:radial-gradient(circle at 1px 1px, #fff 1px, transparent 0); background-size:22px 22px; }
        .leg-wrap{ max-width:1060px; margin:0 auto; padding:0 20px; position:relative; }
        .leg-grid{ display:grid; grid-template-columns:minmax(0,1fr); gap:16px; }
        @media(min-width:940px){
          .leg-grid{ grid-template-columns:minmax(0,1fr) 340px; align-items:start; }
          .leg-side{ position:sticky; top:18px; display:grid; gap:14px; }
        }
        .leg-card{ background:var(--surf); border:1px solid var(--line); border-radius:16px; box-shadow:0 1px 2px rgba(19,32,26,.04); }
        .leg-sec-t{ display:flex; align-items:center; gap:9px; margin:4px 4px 14px; }
        .leg-pol{ background:var(--surf); border:1px solid var(--line); border-radius:18px; overflow:hidden; box-shadow:0 6px 22px -16px rgba(19,32,26,.4); }
        .leg-pol-top{ height:5px; background:linear-gradient(90deg,var(--acc),color-mix(in srgb,var(--acc) 55%,#000)); }
        .leg-patente{ background:#fff; color:#13201A; border:2px solid #13201A; border-radius:7px;
          padding:21px 18px 11px; font-family:'IBM Plex Mono',monospace; font-weight:600; font-size:25px;
          letter-spacing:.2em; display:inline-block; position:relative; line-height:1; box-shadow:0 3px 0 rgba(0,0,0,.08); }
        .leg-patente::before{ content:"ⓂERCOSUR · ARGENTINA"; position:absolute; top:0; left:0; right:0;
          background:#0B3D91; color:#fff; font-size:8.5px; letter-spacing:.18em; text-align:center; padding:3px 6px;
          font-family:'IBM Plex Mono',monospace; border-radius:5px 5px 0 0; }
        /* Cuadro de datos tipo cédula — tiles independientes: se ven bien con 1 dato o con 15 */
        .leg-dl{ display:grid; grid-template-columns:1fr 1fr; gap:8px; }
        @media(max-width:520px){ .leg-dl{ grid-template-columns:1fr; } }
        .leg-dl .cell{ background:var(--paper); border:1px solid var(--line); border-radius:11px; padding:11px 13px; min-width:0; }
        .leg-dl .cell.wide{ grid-column:1 / -1; }
        .leg-dl .cell .v{ font-size:14px; font-weight:600; color:var(--ink); margin-top:3px; word-break:break-word; }
        .leg-stamp{ font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.06em; text-transform:uppercase;
          padding:5px 10px; border-radius:6px; display:inline-flex; align-items:center; gap:5px; font-weight:600; }
        .leg-btn{ display:inline-flex; align-items:center; justify-content:center; gap:8px; padding:12px 18px; border-radius:11px;
          font-size:14px; font-weight:600; cursor:pointer; border:1.5px solid transparent; font-family:'Manrope',sans-serif;
          text-decoration:none; transition:transform .08s ease, filter .15s ease; }
        .leg-btn:active{ transform:translateY(1px); }
        .leg-btn-primary{ background:var(--acc); color:#fff; }
        .leg-btn-primary:hover{ filter:brightness(1.06); }
        .leg-btn-ghost{ background:var(--surf); color:var(--ink); border-color:var(--line); }
        .leg-mark{ width:48px; height:48px; border-radius:13px; background:rgba(255,255,255,.16); color:#fff;
          display:flex; align-items:center; justify-content:center; font-family:'Bricolage Grotesque',serif; font-weight:700; font-size:21px; flex-shrink:0; border:1px solid rgba(255,255,255,.25); }
        .leg-iconbox{ width:46px; height:46px; border-radius:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .leg-row{ display:flex; align-items:center; gap:12px; padding:13px 14px; background:var(--paper); border:1px solid var(--line); border-radius:12px; }
        .leg-copy{ background:transparent; border:0; cursor:pointer; color:var(--muted); display:inline-flex; padding:6px; border-radius:8px; }
        .leg-copy:hover{ background:rgba(0,0,0,.04); color:var(--ink); }
        .leg-sub{ display:flex; align-items:center; gap:7px; margin:18px 0 10px; font-size:11px; }
        .leg-cuota{ display:flex; gap:12px; align-items:flex-start; padding:14px 0; border-top:1px solid var(--line); }
        .leg-drop{ background:var(--paper); border:1.5px dashed var(--acc); border-radius:12px; padding:11px 15px; text-align:center; cursor:pointer; display:inline-flex; align-items:center; gap:8px; color:var(--acc); font-weight:600; font-size:13px; }
        .leg-drop input{ display:none; }
        .leg-msg-ok{ background:#E2F4ED; color:#0A5440; border:1px solid #1C8C6C; }
        .leg-msg-err{ background:#FBEAE7; color:#8C2A18; border:1px solid #C8503A; }
        .leg-sin{ display:flex; gap:12px; align-items:flex-start; padding:13px; background:var(--paper); border:1px solid var(--line); border-radius:12px; }
        /* Seguimiento del siniestro */
        .leg-steps{ display:flex; align-items:flex-start; gap:0; margin-top:12px; }
        .leg-step{ flex:1; min-width:0; display:flex; flex-direction:column; align-items:center; gap:6px; position:relative; }
        .leg-step::before{ content:""; position:absolute; top:8px; left:-50%; width:100%; height:2px; background:var(--line); z-index:0; }
        .leg-step:first-child::before{ display:none; }
        .leg-step.done::before{ background:var(--acc); }
        .leg-step .dot{ width:17px; height:17px; border-radius:50%; background:var(--surf); border:2px solid var(--line); z-index:1; display:flex; align-items:center; justify-content:center; }
        .leg-step.done .dot{ background:var(--acc); border-color:var(--acc); color:#fff; }
        .leg-step.curr .dot{ box-shadow:0 0 0 4px color-mix(in srgb, var(--acc) 22%, transparent); }
        .leg-step .lbl{ font-size:9.5px; line-height:1.15; text-align:center; color:var(--muted); font-family:'IBM Plex Mono',monospace; letter-spacing:.02em; max-width:60px; }
        .leg-step.done .lbl, .leg-step.curr .lbl{ color:var(--ink); font-weight:600; }
        @keyframes legPop{ from{opacity:0; transform:translateY(10px)} to{opacity:1; transform:none} }
        .leg-pop{ animation:legPop .5s cubic-bezier(.2,.7,.2,1) both; }
        @media (prefers-reduced-motion: reduce){ .leg-pop{ animation:none } }
      `}</style>

      {estado === "load" && (
        <div className="leg-cover"><div className="leg-wrap"><p className="leg-eye" style={{ color: "rgba(255,255,255,.8)" }}>Abriendo tu legajo…</p></div></div>
      )}

      {estado === "err" && (
        <div className="leg-wrap">
          <div className="leg-card" style={{ padding: 30, textAlign: "center", marginTop: 90, maxWidth: 460, marginInline: "auto" }}>
            <span style={{ color: "var(--muted)", display: "inline-flex" }}><Ic n="folderx" s={34} /></span>
            <p className="leg-display" style={{ fontSize: 21, margin: "12px 0 4px" }}>No encontramos este legajo</p>
            <p style={{ fontSize: 13.5, color: "var(--muted)" }}>El link puede haber cambiado. Pedile a tu productor uno nuevo.</p>
          </div>
        </div>
      )}

      {estado === "ok" && data && (
        <>
          {/* ── Tapa ── */}
          <div className="leg-cover">
            <div className="leg-wrap">
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {data.productor.logo
                  /* eslint-disable-next-line @next/next/no-img-element */
                  ? <img src={data.productor.logo} alt="" style={{ height: 48, width: 48, objectFit: "contain", background: "#fff", borderRadius: 13, padding: 4 }} />
                  : <span className="leg-mark">{inicial}</span>}
                <div>
                  <p className="leg-display" style={{ margin: 0, fontSize: 16, lineHeight: 1.1, color: "#fff" }}>{data.productor.nombre}</p>
                  <p className="leg-eye" style={{ marginTop: 4, color: "rgba(255,255,255,.72)" }}>Productor de seguros</p>
                </div>
              </div>
              <p className="leg-eye" style={{ color: "rgba(255,255,255,.7)", marginTop: 30 }}>Legajo digital del asegurado</p>
              <p className="leg-display" style={{ margin: "8px 0 0", fontSize: 32, lineHeight: 1.05, color: "#fff" }}>
                Hola, {firstName(data.cliente.nombreApellido) || "—"}
              </p>
              <p style={{ margin: "10px 0 0", fontSize: 14.5, color: "rgba(255,255,255,.85)", lineHeight: 1.5, maxWidth: 560 }}>
                Acá tenés tus pólizas a mano: los datos de cada cobertura, el estado de tus cuotas y el seguimiento de tus siniestros.
              </p>
              {resumen.total > 0 && (
                <div style={{ display: "flex", gap: 22, marginTop: 22, flexWrap: "wrap" }}>
                  <Stat n={resumen.total} label={resumen.total === 1 ? "Póliza" : "Pólizas"} />
                  <Stat n={resumen.vigentes} label="Vigentes" />
                  {(data.siniestros?.length || 0) > 0 && <Stat n={data.siniestros.length} label={data.siniestros.length === 1 ? "Siniestro" : "Siniestros"} />}
                </div>
              )}
            </div>
          </div>

          <div className="leg-wrap" style={{ paddingBottom: 80, marginTop: -68 }}>
            <div className="leg-grid">
              {/* ── Columna principal ── */}
              <div style={{ minWidth: 0 }}>
                {/* Próxima acción */}
                {pendiente && (
                  <a href="#cuotas" className="leg-card leg-pop" style={{ display: "block", textDecoration: "none", color: "inherit", padding: 16, marginBottom: 16, borderLeft: `4px solid ${pendiente.vencida ? "var(--mora)" : "var(--gold)"}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
                      <span className="leg-iconbox" style={{ background: pendiente.vencida ? "#FBEAE7" : "#FBF0DC", color: pendiente.vencida ? "var(--mora)" : "var(--gold)" }}>
                        <Ic n={pendiente.vencida ? "alert" : "receipt"} s={22} />
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p className="leg-display" style={{ margin: 0, fontSize: 15.5 }}>
                          {pendiente.vencida ? "Tenés una cuota vencida" : "Tu próxima cuota"}
                        </p>
                        <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--muted)" }}>
                          {pendiente.pago.mesLabel || pendiente.pago.mes}
                          {pendiente.pago.monto != null ? <> · <span className="leg-mono" style={{ fontWeight: 600, color: "var(--ink)" }}>{moneyAR(pendiente.pago.monto)}</span></> : null}
                          {" · tocá para verla"}
                        </p>
                      </div>
                      <span style={{ color: "var(--muted)" }}><Ic n="arrow" s={18} /></span>
                    </div>
                  </a>
                )}

                {/* Pólizas */}
                {grupos.length > 0 && (
                  <>
                    <div className="leg-sec-t"><span style={{ color: "var(--acc)" }}><Ic n="shield" s={18} /></span><p className="leg-display" style={{ margin: 0, fontSize: 16 }}>Tus pólizas</p></div>
                    <div id="cuotas" style={{ display: "grid", gap: 16 }}>
                      {grupos.map(g => (
                        <PolizaCard key={g.poliza._id} grupo={g} accent={accent}
                          onUpload={handleUpload} subiendoKey={subiendo} msg={msg} copiado={copiado} copiar={copiar} />
                      ))}
                    </div>
                  </>
                )}

                {/* Cobranzas sin póliza asociada */}
                {cobranzasSueltas.length > 0 && (
                  <>
                    <div className="leg-sec-t" style={{ marginTop: 24 }}><span style={{ color: "var(--acc)" }}><Ic n="receipt" s={18} /></span><p className="leg-display" style={{ margin: 0, fontSize: 16 }}>Otras cuotas</p></div>
                    <div style={{ display: "grid", gap: 14 }}>
                      {cobranzasSueltas.map(cob => (
                        <div key={cob._id} className="leg-pol leg-pop" style={{ padding: 18 }}>
                          <p className="leg-display" style={{ margin: "0 0 4px", fontSize: 15 }}>{labelCompania(cob.aseguradora) || "Cobranza"}{cob.patente ? " · " + cob.patente : ""}</p>
                          <CuotasList cob={cob} onUpload={handleUpload} subiendoKey={subiendo} msg={msg} />
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Siniestros sin póliza asociada */}
                {siniestrosSueltos.length > 0 && (
                  <>
                    <div className="leg-sec-t" style={{ marginTop: 24 }}><span style={{ color: "var(--mora)" }}><Ic n="triangle" s={18} /></span><p className="leg-display" style={{ margin: 0, fontSize: 16 }}>Otros siniestros</p></div>
                    <div style={{ display: "grid", gap: 10 }}>
                      {siniestrosSueltos.map(s => <SiniestroRow key={s._id} s={s} />)}
                    </div>
                  </>
                )}

                {grupos.length === 0 && cobranzasSueltas.length === 0 && (
                  <div className="leg-card" style={{ padding: 26, textAlign: "center" }}>
                    <span style={{ color: "var(--muted)", display: "inline-flex" }}><Ic n="shield" s={30} /></span>
                    <p className="leg-display" style={{ fontSize: 17, margin: "10px 0 4px" }}>Todavía no hay pólizas cargadas</p>
                    <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>Cuando tu productor cargue tus coberturas, las vas a ver acá.</p>
                  </div>
                )}
              </div>

              {/* ── Columna lateral ── */}
              <aside className="leg-side">
                {/* Cómo pagar */}
                {pago && (
                  <section className="leg-card leg-pop" style={{ padding: 18 }}>
                    <div className="leg-sec-t" style={{ margin: "0 0 14px" }}>
                      <span style={{ color: "var(--acc)" }}><Ic n="card" s={18} /></span>
                      <p className="leg-display" style={{ margin: 0, fontSize: 15 }}>Cómo pagar</p>
                    </div>
                    <div style={{ display: "grid", gap: 9 }}>
                      {pago.alias && (
                        <div className="leg-row">
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p className="leg-eye" style={{ marginBottom: 3 }}>Alias</p>
                            <p className="leg-mono" style={{ margin: 0, fontSize: 16, fontWeight: 600, wordBreak: "break-all" }}>{pago.alias}</p>
                          </div>
                          <button className="leg-copy" onClick={() => copiar("alias", pago.alias!)} title="Copiar alias">
                            <Ic n={copiado === "alias" ? "check" : "copy"} s={18} />
                          </button>
                        </div>
                      )}
                      {pago.cbu && (
                        <div className="leg-row">
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p className="leg-eye" style={{ marginBottom: 3 }}>CBU / CVU</p>
                            <p className="leg-mono" style={{ margin: 0, fontSize: 14.5, fontWeight: 600, wordBreak: "break-all" }}>{pago.cbu}</p>
                          </div>
                          <button className="leg-copy" onClick={() => copiar("cbu", pago.cbu!)} title="Copiar CBU">
                            <Ic n={copiado === "cbu" ? "check" : "copy"} s={18} />
                          </button>
                        </div>
                      )}
                      {(pago.titular || pago.banco) && (
                        <p style={{ margin: "2px 2px 0", fontSize: 12.5, color: "var(--muted)", display: "flex", alignItems: "center", gap: 6 }}>
                          <Ic n="bank" s={14} />
                          {[pago.titular, pago.banco].filter(Boolean).join(" · ")}
                        </p>
                      )}
                      {pago.linkPago && (
                        <a href={pago.linkPago} target="_blank" rel="noreferrer" className="leg-btn leg-btn-primary" style={{ marginTop: 4 }}>
                          <Ic n="card" s={17} /> Pagar ahora
                        </a>
                      )}
                      {pago.nota && (
                        <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--muted)", background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px", lineHeight: 1.5 }}>
                          {pago.nota}
                        </p>
                      )}
                    </div>
                  </section>
                )}

                {/* Teléfonos de las compañías */}
                {companias.length > 0 && (
                  <section className="leg-card leg-pop" style={{ padding: 18 }}>
                    <div className="leg-sec-t" style={{ margin: "0 0 4px" }}>
                      <span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--mora)", flexShrink: 0 }} />
                      <p className="leg-display" style={{ margin: 0, fontSize: 15 }}>Teléfonos de tus compañías</p>
                    </div>
                    {companias.map((c, i) => (
                      <div key={i} style={{ padding: "12px 0 4px", borderTop: i === 0 ? 0 : "1px solid var(--line)", marginTop: i === 0 ? 8 : 0 }}>
                        <p className="leg-display" style={{ margin: "0 0 2px", fontSize: 13.5 }}>{labelCompania(c.nombre)}</p>
                        {c.notasDelPAS && <p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--muted)", lineHeight: 1.45 }}>{c.notasDelPAS}</p>}
                        <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                          {c.telefonoAuxilio && <TelRow label="Auxilio en ruta" tel={c.telefonoAuxilio} accent={accent} />}
                          {c.telefonoSiniestros && <TelRow label="Denunciar un siniestro" tel={c.telefonoSiniestros} accent={accent} />}
                          {(c.appUrl || c.sitioWeb) && (
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              {c.appUrl && <a href={c.appUrl} target="_blank" rel="noreferrer" className="leg-btn leg-btn-ghost" style={{ flex: 1, fontSize: 12.5, padding: "10px 12px" }}><Ic n="mobile" s={15} /> App</a>}
                              {c.sitioWeb && <a href={c.sitioWeb} target="_blank" rel="noreferrer" className="leg-btn leg-btn-ghost" style={{ flex: 1, fontSize: 12.5, padding: "10px 12px" }}><Ic n="world" s={15} /> Sitio web</a>}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </section>
                )}

                {/* Contacto del productor */}
                {wa && (
                  <section className="leg-card leg-pop" style={{ padding: 18 }}>
                    <p className="leg-display" style={{ margin: "0 0 4px", fontSize: 15 }}>¿Una duda?</p>
                    <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>Escribile directo a {firstName(data.productor.nombre)} y te da una mano.</p>
                    <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="leg-btn" style={{ background: "#25D366", color: "#fff", width: "100%" }}>
                      <Ic n="whatsapp" s={18} /> Escribir por WhatsApp
                    </a>
                  </section>
                )}
              </aside>
            </div>

            <p style={{ textAlign: "center", margin: "34px 0 4px", fontSize: 11.5, color: "var(--muted)" }}>
              Tu legajo lo lleva <strong>{data.productor.nombre}</strong> con <strong>WAC Seguros</strong>
            </p>
          </div>
        </>
      )}
    </main>
  )
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div>
      <p className="leg-display" style={{ margin: 0, fontSize: 26, lineHeight: 1, color: "#fff" }}>{n}</p>
      <p className="leg-eye" style={{ marginTop: 5, color: "rgba(255,255,255,.72)" }}>{label}</p>
    </div>
  )
}

function Campo({ label, value, mono, wide }: { label: string; value?: React.ReactNode; mono?: boolean; wide?: boolean }) {
  if (value == null || value === "") return null
  return (
    <div className={"cell" + (wide ? " wide" : "")}>
      <span className="leg-eye">{label}</span>
      <p className={"v" + (mono ? " leg-mono" : "")} style={{ margin: 0 }}>{value}</p>
    </div>
  )
}

function PolizaCard({
  grupo, accent, onUpload, subiendoKey, msg, copiado, copiar,
}: {
  grupo: PolizaGroup; accent: string
  onUpload: (cobranzaId: string, mes: string, file: File) => Promise<void>
  subiendoKey: string | null; msg: Msg
  copiado: string | null; copiar: (label: string, value: string) => void
}) {
  const v = grupo.poliza
  const vigente = v.estado === "VIGENTE"
  const tone = vigente ? "ok" : v.estado === "ANULADA" || v.estado === "NO_VIGENTE" ? "neutral" : "next"
  const titulo = v.datosRiesgo || labelRamo(v.ramo) || (v.numPoliza ? `Póliza N° ${v.numPoliza}` : "")
    || labelCompania(v.aseguradora) || v.patente || "Tu cobertura"
  const esVehiculo = esVehiculoRamo(v)

  return (
    <div className="leg-pol leg-pop">
      <div className="leg-pol-top" />
      <div style={{ padding: 20 }}>
        {/* Encabezado */}
        <div style={{ display: "flex", gap: 13, alignItems: "flex-start" }}>
          <span className="leg-iconbox" style={{ background: `color-mix(in srgb, ${accent} 12%, #fff)`, color: accent }}><Ic n={iconRamo(v.ramo)} s={24} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="leg-display" style={{ margin: 0, fontSize: 18, lineHeight: 1.2 }}>{titulo}</p>
            <p style={{ margin: "3px 0 0", fontSize: 12.5, color: "var(--muted)" }}>
              {labelCompania(v.aseguradora)}{v.tipoCobertura ? " · " + v.tipoCobertura : ""}
            </p>
          </div>
          <span className="leg-stamp" style={TONES[tone]}>
            {vigente && <Ic n="check" s={13} w={2.4} />}
            {ESTADO_POLIZA[v.estado || ""] || labelRamo(v.estado) || "—"}
          </span>
        </div>

        {/* Patente MERCOSUR */}
        {esVehiculo && (
          <div style={{ textAlign: "center", margin: "20px 0 6px" }}><span className="leg-patente">{v.patente}</span></div>
        )}

        {/* Cuadro de datos tipo cédula */}
        <div className="leg-dl" style={{ marginTop: esVehiculo ? 14 : 16 }}>
          <Campo label="Compañía" value={labelCompania(v.aseguradora)} />
          <Campo label="N° de póliza" value={v.numPoliza} mono />
          <Campo label="Ramo" value={labelRamo(v.ramo)} />
          <Campo label="Cobertura" value={v.tipoCobertura} />
          <Campo label="Medio de pago" value={v.medioDePago ? (MEDIO_PAGO[v.medioDePago] || labelRamo(v.medioDePago)) : ""} />
          {!esVehiculo && v.patente !== titulo && <Campo label="Patente / Bien" value={v.patente} mono />}
          <Campo label="Vigencia desde" value={dateAR(v.fechaInicVig)} mono />
          <Campo label="Vigencia hasta" value={dateAR(v.fechaFinVig)} mono />
          <Campo label="N° de chasis" value={v.chasis} mono />
          <Campo label="N° de motor" value={v.motor} mono />
          {v.gnc && <Campo label="GNC" value="Sí" />}
          {(v.domicilio || v.localidad) && <Campo label="Domicilio del riesgo" value={[v.domicilio, v.localidad].filter(Boolean).join(" · ")} wide />}
          {v.datosRiesgo && v.datosRiesgo !== titulo && <Campo label="Datos del riesgo" value={v.datosRiesgo} wide />}
        </div>

        {/* Cuotas */}
        {grupo.cobranzas.length > 0 && (
          <>
            <div className="leg-sub leg-eye"><Ic n="receipt" s={14} /> Cuotas</div>
            {grupo.cobranzas.map(cob => (
              <CuotasList key={cob._id} cob={cob} onUpload={onUpload} subiendoKey={subiendoKey} msg={msg} />
            ))}
          </>
        )}

        {/* Siniestros */}
        {grupo.siniestros.length > 0 && (
          <>
            <div className="leg-sub leg-eye" style={{ color: "var(--mora)" }}><Ic n="triangle" s={14} /> Siniestros</div>
            <div style={{ display: "grid", gap: 10 }}>
              {grupo.siniestros.map(s => <SiniestroRow key={s._id} s={s} />)}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function CuotasList({
  cob, onUpload, subiendoKey, msg,
}: {
  cob: LegajoCobranza
  onUpload: (cobranzaId: string, mes: string, file: File) => Promise<void>
  subiendoKey: string | null; msg: Msg
}) {
  const pagadas = cob.pagos.filter(p => p.estado === "COBRADA").length
  const total = cob.numeroCuotasTotal || cob.pagos.length
  const proxIdx = cob.pagos.findIndex(p => p.estado !== "COBRADA" && p.estado !== "NO_CORRESPONDE" && p.estado !== "ANULADA")
  const [abierto, setAbierto] = useState(proxIdx >= 0)

  return (
    <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 13, padding: "4px 16px" }}>
      <button onClick={() => setAbierto(v => !v)} style={{ width: "100%", textAlign: "left", padding: "12px 0", background: "transparent", border: 0, cursor: "pointer", display: "flex", alignItems: "center", gap: 11, color: "inherit" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{ position: "relative", width: 70, height: 5, borderRadius: 3, background: "var(--line)", overflow: "hidden", flexShrink: 0 }}>
              <span style={{ position: "absolute", inset: 0, width: `${total ? (pagadas / total) * 100 : 0}%`, background: "var(--acc)" }} />
            </span>
            <span className="leg-eye">{pagadas} de {total} pagadas</span>
          </div>
        </div>
        <span style={{ color: "var(--muted)", transform: abierto ? "rotate(180deg)" : "none", transition: "transform .2s" }}><Ic n="arrow" s={16} /></span>
      </button>

      {abierto && cob.pagos.map(p => {
        const key = `${cob._id}:${p.mes}`
        const chip = estadoChip(p)
        const canUpload = p.estado !== "COBRADA" && p.estado !== "COMPROBANTE_RECIBIDO" && p.estado !== "ANULADA" && p.estado !== "NO_CORRESPONDE"
        const yaSubio = p.estado === "COMPROBANTE_RECIBIDO"
        const showMsg = msg && msg.key === key
        return (
          <div key={p.mes} className="leg-cuota" style={{ flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 150 }}>
              <p className="leg-display" style={{ margin: 0, fontSize: 14 }}>{p.mesLabel || p.mes}{p.numeroCuota ? ` · cuota ${p.numeroCuota}` : ""}</p>
              <div style={{ marginTop: 7, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                <span className="leg-stamp" style={TONES[chip.tone]}>{chip.label}</span>
                {p.monto != null && <span className="leg-mono" style={{ fontSize: 14, fontWeight: 600 }}>{moneyAR(p.monto)}</span>}
              </div>
              {yaSubio && <p style={{ margin: "9px 0 0", fontSize: 12, color: "var(--muted)" }}>Recibimos tu comprobante el {dateAR(p.comprobante?.subidoEn, true)}. Lo está revisando tu productor.</p>}
              {p.comprobante?.rechazadoEn && <p style={{ margin: "9px 0 0", fontSize: 12, color: "var(--mora)" }}>Tu comprobante fue rechazado{p.comprobante.rechazoMotivo ? `: ${p.comprobante.rechazoMotivo}` : "."} Probá subir uno nuevo.</p>}
            </div>
            {canUpload && (
              <label className="leg-drop" style={{ alignSelf: "center" }}>
                <input type="file" accept="image/*,application/pdf" disabled={subiendoKey === key}
                  onChange={async e => { const f = e.target.files?.[0]; if (f) await onUpload(cob._id, p.mes, f); e.target.value = "" }} />
                <Ic n="camera" s={18} />
                {subiendoKey === key ? "Enviando…" : "Subir comprobante"}
              </label>
            )}
            {showMsg && (
              <div className={msg!.tone === "ok" ? "leg-msg-ok" : "leg-msg-err"} style={{ width: "100%", borderRadius: 10, padding: "9px 13px", fontSize: 12.5 }}>{msg!.text}</div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function SiniestroRow({ s }: { s: LegajoSiniestro }) {
  const est = ESTADO_SINIESTRO[s.estado || "DENUNCIADO"] || ESTADO_SINIESTRO.DENUNCIADO
  const tipo = TIPO_SINIESTRO[s.tipoSiniestro || "OTRO"] || labelRamo(s.tipoSiniestro) || "Siniestro"
  const rechazado = s.estado === "RECHAZADO"
  const idx = pasoActual(s.estado)
  return (
    <div className="leg-sin" style={{ flexDirection: "column", alignItems: "stretch" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <span className="leg-iconbox" style={{ width: 40, height: 40, background: "#FBEAE7", color: "var(--mora)" }}><Ic n="triangle" s={19} /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <p className="leg-display" style={{ margin: 0, fontSize: 14 }}>{tipo}</p>
            <span className="leg-stamp" style={TONES[est.tone]}>{est.label}</span>
          </div>
          <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--muted)" }}>
            {[
              s.fechaOcurrencia ? dateAR(s.fechaOcurrencia, true) : "",
              s.bienAsegurado || "",
              s.numeroSiniestro ? "N° " + s.numeroSiniestro : "",
            ].filter(Boolean).join(" · ")}
          </p>
          {s.denunciaAdministrativa === "PENDIENTE" && (
            <p style={{ margin: "5px 0 0", fontSize: 11.5, color: "var(--gold)" }}>Denuncia administrativa pendiente</p>
          )}
        </div>
      </div>

      {/* Seguimiento del trámite */}
      {rechazado ? (
        <div style={{ marginTop: 12, background: "#FBEAE7", border: "1px solid #C8503A", color: "#8C2A18", borderRadius: 10, padding: "9px 12px", fontSize: 12.5, display: "flex", alignItems: "center", gap: 8 }}>
          <Ic n="alert" s={16} /> Este siniestro fue rechazado. Si tenés dudas, escribinos.
        </div>
      ) : (
        <div className="leg-steps">
          {SINIESTRO_PASOS.map((p, i) => {
            const cls = i < idx ? "done" : i === idx ? "done curr" : ""
            return (
              <div key={p.key} className={`leg-step ${cls}`}>
                <span className="dot">{i < idx ? <Ic n="check" s={10} w={3} /> : null}</span>
                <span className="lbl">{p.label}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function TelRow({ label, tel, accent }: { label: string; tel: string; accent: string }) {
  return (
    <a href={`tel:${tel.replace(/\s+/g, "")}`} style={{ textDecoration: "none" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--surf)", border: "1px solid var(--line)", borderRadius: 12, padding: "11px 13px" }}>
        <div>
          <p style={{ margin: 0, fontSize: 10.5, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".08em" }}>{label}</p>
          <p className="leg-mono" style={{ margin: "2px 0 0", fontSize: 17, fontWeight: 600, color: "var(--ink)" }}>{tel}</p>
        </div>
        <span style={{ color: accent }}><Ic n="phone" s={19} /></span>
      </div>
    </a>
  )
}

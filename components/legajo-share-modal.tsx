"use client"

import { useEffect, useState } from "react"
import { legajoAseguradoAPI } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Loader2, Copy, Check, Download, MessageCircle, IdCard } from "lucide-react"

// Modal para compartir el legajo digital de un asegurado: link público
// (/asegurado/<token>), QR descargable y envío por WhatsApp. El legajo se
// identifica por nombre + email (matchea las pólizas/cobranzas del cliente).
export function LegajoShareModal({
  open, onClose, nombreApellido, email, whatsapp,
}: {
  open: boolean
  onClose: () => void
  nombreApellido: string
  email?: string
  whatsapp?: string
}) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [url, setUrl] = useState("")
  const [qr, setQr] = useState("")
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) return
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
    if (!token) return
    setLoading(true); setUrl(""); setQr("")
    legajoAseguradoAPI
      .linkPorDatos(token, { nombreApellido, email })
      .then(async (r) => {
        setUrl(r.url)
        const QRCode = (await import("qrcode")).default
        const dataUrl = await QRCode.toDataURL(r.url, {
          width: 640, margin: 1, color: { dark: "#0f172a", light: "#ffffff" },
        })
        setQr(dataUrl)
      })
      .catch((e: any) =>
        toast({ variant: "destructive", title: "No se pudo generar el legajo", description: e?.message }),
      )
      .finally(() => setLoading(false))
  }, [open, nombreApellido, email, toast])

  const copiar = () => {
    if (!url) return
    navigator.clipboard?.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  const descargarQR = () => {
    if (!qr) return
    const a = document.createElement("a")
    a.href = qr
    a.download = `legajo-${nombreApellido.replace(/\s+/g, "-").toLowerCase()}.png`
    a.click()
  }

  const enviarWhatsApp = () => {
    if (!whatsapp || !url) return
    const num = whatsapp.replace(/\D/g, "")
    const msg = encodeURIComponent(
      `Hola ${nombreApellido}, este es tu legajo digital. Ahí podés ver tus pólizas y cuotas, y subir tus comprobantes de pago:\n${url}`,
    )
    window.open(`https://wa.me/54${num}?text=${msg}`, "_blank")
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-start gap-2 pr-6">
            <IdCard className="h-5 w-5 shrink-0 mt-0.5 text-emerald-600" />
            <span className="min-w-0 break-words leading-snug">Legajo de {nombreApellido}</span>
          </DialogTitle>
          <DialogDescription>
            Compartí este link o QR con tu cliente: ve sus pólizas y cuotas, y sube sus comprobantes.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex flex-col items-stretch gap-3">
            {qr && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={qr} alt="QR del legajo" style={{ display: "block", width: 176, height: 176, maxWidth: "100%", margin: "0 auto" }} className="rounded-lg border bg-white p-2" />
            )}
            <Button variant="outline" className="w-full gap-2" onClick={copiar} disabled={!url}>
              {copied ? <><Check className="h-4 w-4 text-emerald-600" /> Link copiado</> : <><Copy className="h-4 w-4" /> Copiar link</>}
            </Button>
            <Button onClick={enviarWhatsApp} disabled={!whatsapp || !url} className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" title={whatsapp ? "Enviar por WhatsApp" : "Esta cobranza no tiene WhatsApp cargado"}>
              <MessageCircle className="h-4 w-4" /> Enviar por WhatsApp
            </Button>
            <Button variant="ghost" className="w-full gap-2" onClick={descargarQR} disabled={!qr}>
              <Download className="h-4 w-4" /> Descargar QR
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

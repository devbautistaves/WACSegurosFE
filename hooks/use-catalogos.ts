// Catálogos de Aseguradora / Ramo / Medio de Pago, reactivos a "branding-updated".
// Reads localStorage.branding (hydrated por dashboard-layout via /api/branding/public).
// Si el catálogo guardado está vacío, devuelve los defaults pasados como argumento.
//
// Uso típico en una página con selects:
//   const { aseguradoras, ramos } = useCatalogos(ASEGURADORAS_DEFAULT, RAMOS_DEFAULT)
//   ...
//   {aseguradoras.map(a => <SelectItem key={a} value={a}>{ASEGURADORA_LABELS[a] || a}</SelectItem>)}

"use client"

import { useEffect, useState } from "react"

interface CatalogosState {
  aseguradoras: string[]
  ramos: string[]
  mediosPago: string[]
}

function readFromStorage(defaultAseg: string[], defaultRamos: string[], defaultMedios: string[]): CatalogosState {
  if (typeof window === "undefined") return { aseguradoras: defaultAseg, ramos: defaultRamos, mediosPago: defaultMedios }
  try {
    const raw = localStorage.getItem("branding")
    if (!raw) return { aseguradoras: defaultAseg, ramos: defaultRamos, mediosPago: defaultMedios }
    const b = JSON.parse(raw)
    return {
      aseguradoras: Array.isArray(b.aseguradorasCatalogo) && b.aseguradorasCatalogo.length ? b.aseguradorasCatalogo : defaultAseg,
      ramos: Array.isArray(b.ramosCatalogo) && b.ramosCatalogo.length ? b.ramosCatalogo : defaultRamos,
      mediosPago: Array.isArray(b.mediosPagoCatalogo) && b.mediosPagoCatalogo.length ? b.mediosPagoCatalogo : defaultMedios,
    }
  } catch {
    return { aseguradoras: defaultAseg, ramos: defaultRamos, mediosPago: defaultMedios }
  }
}

export function useCatalogos(
  defaultAseguradoras: string[] = [],
  defaultRamos: string[] = [],
  defaultMediosPago: string[] = [],
): CatalogosState {
  const [state, setState] = useState<CatalogosState>(() =>
    readFromStorage(defaultAseguradoras, defaultRamos, defaultMediosPago)
  )

  useEffect(() => {
    const sync = () => setState(readFromStorage(defaultAseguradoras, defaultRamos, defaultMediosPago))
    sync() // re-read on mount (client-side)
    window.addEventListener("branding-updated", sync)
    window.addEventListener("storage", (e) => { if (e.key === "branding") sync() })
    return () => {
      window.removeEventListener("branding-updated", sync)
      window.removeEventListener("storage", sync as any)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return state
}

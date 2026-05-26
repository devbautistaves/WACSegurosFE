import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { Providers } from "./providers"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

export const metadata: Metadata = {
  title: {
    default: "TusVentas.digital - Plataforma de Gestion de Ventas y Comisiones",
    template: "%s | TusVentas.digital",
  },
  description: "TusVentas.digital: La plataforma integral para gestionar equipos de ventas, calcular comisiones automaticamente, seguimiento de leads y reportes avanzados. Potencia tu equipo comercial.",
  keywords: [
    "gestion de ventas",
    "software de ventas",
    "comisiones automaticas",
    "CRM ventas",
    "gestion de equipos comerciales",
    "seguimiento de leads",
    "reportes de ventas",
    "dashboard de ventas",
    "plataforma de ventas",
    "tusventas",
    "software para vendedores",
    "gestion comercial",
    "calculo de comisiones",
    "pipeline de ventas",
  ],
  authors: [{ name: "TusVentas.digital" }],
  creator: "TusVentas.digital",
  publisher: "TusVentas.digital",
  metadataBase: new URL("https://tusventas.digital"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: "https://tusventas.digital",
    siteName: "TusVentas.digital",
    title: "TusVentas.digital - Potencia tu Gestion de Ventas",
    description: "La plataforma integral para gestionar equipos de ventas, calcular comisiones automaticamente y hacer crecer tu negocio.",
    images: [
      {
        url: "/images/tusventas-logo.png",
        width: 1200,
        height: 630,
        alt: "TusVentas.digital - Plataforma de Gestion de Ventas",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TusVentas.digital - Potencia tu Gestion de Ventas",
    description: "La plataforma integral para gestionar equipos de ventas, calcular comisiones automaticamente y hacer crecer tu negocio.",
    images: ["/images/tusventas-logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  category: "Software",
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0f172a" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className="bg-slate-950">
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
          {children}
        </Providers>
        <Toaster />
      </body>
    </html>
  )
}

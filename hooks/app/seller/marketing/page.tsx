"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ExternalLink, FileText, Image, Video, Presentation, Download } from "lucide-react"

const MARKETING_FOLDER_URL = "https://drive.google.com/drive/folders/1SWJEfm92y0YF6djzklKaEPsdKgZgsHHA"

const marketingResources = [
  {
    title: "Catalogo de Productos",
    description: "PDF con todos los planes y precios actualizados",
    icon: FileText,
    link: MARKETING_FOLDER_URL,
    type: "PDF",
  },
  {
    title: "Imagenes Promocionales",
    description: "Banners y graficos para redes sociales",
    icon: Image,
    link: MARKETING_FOLDER_URL,
    type: "Imagenes",
  },
  {
    title: "Videos de Capacitacion",
    description: "Tutoriales y guias de venta",
    icon: Video,
    link: MARKETING_FOLDER_URL,
    type: "Videos",
  },
  {
    title: "Presentaciones",
    description: "Slides para reuniones con clientes",
    icon: Presentation,
    link: MARKETING_FOLDER_URL,
    type: "Presentacion",
  },
]

export default function MarketingPage() {
  return (
    <DashboardLayout requiredRole="seller">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Material de Marketing</h1>
          <p className="text-muted-foreground">
            Accede a todo el material de ventas disponible
          </p>
        </div>

        {/* Main CTA */}
        <Card className="border-primary/50 bg-gradient-to-r from-primary/10 to-primary/5">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-center md:text-left">
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Carpeta Principal de Marketing
                </h2>
                <p className="text-muted-foreground max-w-md">
                  Accede a todo el material de marketing, presentaciones, imagenes y videos desde Google Drive.
                </p>
              </div>
              <a
                href={MARKETING_FOLDER_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <ExternalLink className="mr-2 h-5 w-5" />
                  Abrir Google Drive
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Resources Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {marketingResources.map((resource) => {
            const Icon = resource.icon
            return (
              <Card key={resource.title} className="border-border/50 bg-card/50 hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-secondary text-muted-foreground">
                      {resource.type}
                    </span>
                  </div>
                  <CardTitle className="mt-4">{resource.title}</CardTitle>
                  <CardDescription>{resource.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <a href={resource.link} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="w-full">
                      <Download className="mr-2 h-4 w-4" />
                      Acceder
                    </Button>
                  </a>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Tips Section */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle>Consejos de Venta</CardTitle>
            <CardDescription>Mejores practicas para cerrar ventas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                <h3 className="font-semibold text-foreground mb-2">Escucha Activa</h3>
                <p className="text-sm text-muted-foreground">
                  Entiende las necesidades del cliente antes de ofrecer un plan.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                <h3 className="font-semibold text-foreground mb-2">Conoce el Producto</h3>
                <p className="text-sm text-muted-foreground">
                  Domina todos los beneficios y caracteristicas de cada plan.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                <h3 className="font-semibold text-foreground mb-2">Seguimiento</h3>
                <p className="text-sm text-muted-foreground">
                  Mantente en contacto con prospectos y clientes existentes.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

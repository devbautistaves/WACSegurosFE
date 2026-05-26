"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { FileImage, FileVideo, FileText, Download, ExternalLink, Folder, Plus, Image, Video, File } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useCompany } from "@/lib/company-context"
import { DashboardLayout } from "@/components/layout/dashboard-layout"

// Datos de ejemplo - En produccion vendrian del backend
const MATERIALS = {
  tupaginaya: [
    {
      id: "1",
      category: "Flyers",
      name: "Flyer Landing Page",
      description: "Flyer promocional para servicios de landing page",
      type: "image",
      url: "#",
      createdAt: "2024-01-15",
    },
    {
      id: "2",
      category: "Flyers",
      name: "Flyer E-commerce",
      description: "Flyer promocional para tiendas online",
      type: "image",
      url: "#",
      createdAt: "2024-01-15",
    },
    {
      id: "3",
      category: "Precios",
      name: "Lista de Precios 2024",
      description: "Precios actualizados de todos los servicios",
      type: "document",
      url: "#",
      createdAt: "2024-01-10",
    },
    {
      id: "4",
      category: "Videos",
      name: "Video Demo TuPaginaYa",
      description: "Video demostrativo del servicio",
      type: "video",
      url: "#",
      createdAt: "2024-01-05",
    },
    {
      id: "5",
      category: "Presentaciones",
      name: "Presentacion Corporativa",
      description: "PPT para reuniones con clientes",
      type: "document",
      url: "#",
      createdAt: "2024-01-01",
    },
    {
      id: "6",
      category: "Redes Sociales",
      name: "Pack Stories Instagram",
      description: "Templates para historias de Instagram",
      type: "image",
      url: "#",
      createdAt: "2024-02-01",
    },
  ],
  tusventas: [
    {
      id: "1",
      category: "Flyers",
      name: "Flyer Internet Fibra",
      description: "Flyer promocional fibra optica",
      type: "image",
      url: "#",
      createdAt: "2024-01-15",
    },
    {
      id: "2",
      category: "Precios",
      name: "Lista de Planes Internet",
      description: "Planes y precios de internet",
      type: "document",
      url: "#",
      createdAt: "2024-01-10",
    },
  ],
}

const CATEGORIES = ["Flyers", "Precios", "Videos", "Presentaciones", "Redes Sociales", "Otros"]

export default function MaterialsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { currentCompany } = useCompany()
  
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [materials, setMaterials] = useState<typeof MATERIALS.tupaginaya>([])

  useEffect(() => {
    // Cargar materiales segun empresa
    const companyMaterials = MATERIALS[currentCompany.id as keyof typeof MATERIALS] || []
    setMaterials(companyMaterials)
  }, [currentCompany])

  const filteredMaterials = selectedCategory === "all" 
    ? materials 
    : materials.filter(m => m.category === selectedCategory)

  const getIcon = (type: string) => {
    switch (type) {
      case "image": return <Image className="h-8 w-8 text-blue-500" />
      case "video": return <Video className="h-8 w-8 text-purple-500" />
      case "document": return <File className="h-8 w-8 text-emerald-500" />
      default: return <File className="h-8 w-8 text-gray-500" />
    }
  }

  const getCategoryCount = (category: string) => {
    return materials.filter(m => m.category === category).length
  }

  return (
    <DashboardLayout requiredRole="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Material Grafico</h1>
          <p className="text-muted-foreground">
            Recursos de marketing para {currentCompany.name}
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Subir Material
        </Button>
      </div>

      {/* Categories */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card 
          className={`cursor-pointer transition-colors hover:border-primary ${selectedCategory === "all" ? "border-primary bg-primary/5" : ""}`}
          onClick={() => setSelectedCategory("all")}
        >
          <CardContent className="pt-6 text-center">
            <Folder className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="font-medium">Todos</p>
            <p className="text-sm text-muted-foreground">{materials.length} archivos</p>
          </CardContent>
        </Card>
        
        {CATEGORIES.map((category) => {
          const count = getCategoryCount(category)
          if (count === 0) return null
          
          return (
            <Card 
              key={category}
              className={`cursor-pointer transition-colors hover:border-primary ${selectedCategory === category ? "border-primary bg-primary/5" : ""}`}
              onClick={() => setSelectedCategory(category)}
            >
              <CardContent className="pt-6 text-center">
                <Folder className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="font-medium">{category}</p>
                <p className="text-sm text-muted-foreground">{count} archivos</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Materials Grid */}
      <Card>
        <CardHeader>
          <CardTitle>
            {selectedCategory === "all" ? "Todos los Materiales" : selectedCategory}
          </CardTitle>
          <CardDescription>
            {filteredMaterials.length} archivos disponibles
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredMaterials.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Folder className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay materiales en esta categoria</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredMaterials.map((material) => (
                <Card key={material.id} className="overflow-hidden">
                  <div className="aspect-video bg-secondary flex items-center justify-center">
                    {getIcon(material.type)}
                  </div>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{material.name}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {material.description}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs bg-secondary px-2 py-1 rounded">
                            {material.category}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(material.createdAt).toLocaleDateString("es-AR")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button variant="outline" size="sm" className="flex-1">
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Ver
                      </Button>
                      <Button size="sm" className="flex-1">
                        <Download className="h-4 w-4 mr-1" />
                        Descargar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </DashboardLayout>
  )
}

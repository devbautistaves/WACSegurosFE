"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useToast } from "@/hooks/use-toast"
import { materialsAPI, MarketingMaterial, MaterialCategory } from "@/lib/api"
import { 
  Folder, 
  FileImage, 
  FileVideo, 
  FileText, 
  File,
  Download,
  Eye,
  GraduationCap,
  Megaphone,
  Globe,
  ArrowLeft
} from "lucide-react"

const CATEGORY_CONFIG: Record<MaterialCategory, { label: string; description: string; icon: typeof Folder; color: string }> = {
  induccion: {
    label: "Induccion",
    description: "Material de capacitacion y onboarding",
    icon: GraduationCap,
    color: "blue",
  },
  publicidad: {
    label: "Publicidad",
    description: "Material publicitario y promocional",
    icon: Megaphone,
    color: "purple",
  },
  demos_entregadas: {
    label: "Demos Entregadas",
    description: "Ejemplos de demos entregadas a clientes",
    icon: Globe,
    color: "green",
  },
}

export default function SupervisorMaterialsPage() {
  const router = useRouter()
  const { toast } = useToast()
  
  const [materials, setMaterials] = useState<MarketingMaterial[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<MaterialCategory | null>(null)

  useEffect(() => {
    loadMaterials()
  }, [])

  const loadMaterials = async () => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem("token")
      if (!token) {
        router.push("/login")
        return
      }

      const response = await materialsAPI.getAll(token)
      if (response.success) {
        setMaterials(response.materials)
      }
    } catch (error) {
      console.error("Error loading materials:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los materiales",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case "image":
        return <FileImage className="h-8 w-8 text-blue-500" />
      case "video":
        return <FileVideo className="h-8 w-8 text-purple-500" />
      case "document":
        return <FileText className="h-8 w-8 text-green-500" />
      default:
        return <File className="h-8 w-8 text-gray-500" />
    }
  }

  const getMaterialsByCategory = (category: MaterialCategory) => {
    return materials.filter(m => m.category === category)
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ""
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (isLoading) {
    return (
      <DashboardLayout requiredRole="supervisor">
        <div className="flex items-center justify-center h-[60vh]">
          <Spinner className="h-8 w-8 text-primary" />
        </div>
      </DashboardLayout>
    )
  }

  // Show folder view
  if (!selectedCategory) {
    return (
      <DashboardLayout requiredRole="supervisor">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-foreground">Material Grafico</h1>
            <p className="text-muted-foreground">
              Material de marketing disponible para el equipo
            </p>
          </div>

          {/* Folders Grid */}
          <div className="grid gap-6 md:grid-cols-3">
            {(Object.entries(CATEGORY_CONFIG) as [MaterialCategory, typeof CATEGORY_CONFIG[MaterialCategory]][]).map(([category, config]) => {
              const Icon = config.icon
              const count = getMaterialsByCategory(category).length
              
              return (
                <Card 
                  key={category}
                  className="cursor-pointer hover:border-primary hover:shadow-lg transition-all group"
                  onClick={() => setSelectedCategory(category)}
                >
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className={`p-6 rounded-2xl bg-${config.color}-500/10 group-hover:bg-${config.color}-500/20 transition-colors`}>
                        <Icon className={`h-12 w-12 text-${config.color}-500`} />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold">{config.label}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {config.description}
                        </p>
                        <p className="text-sm font-medium text-primary mt-2">
                          {count} {count === 1 ? "archivo" : "archivos"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // Show category content
  const categoryConfig = CATEGORY_CONFIG[selectedCategory]
  const categoryMaterials = getMaterialsByCategory(selectedCategory)
  const CategoryIcon = categoryConfig.icon

  return (
    <DashboardLayout requiredRole="supervisor">
      <div className="space-y-6">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setSelectedCategory(null)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <CategoryIcon className={`h-6 w-6 text-${categoryConfig.color}-500`} />
                {categoryConfig.label}
              </h1>
              <p className="text-muted-foreground">
                {categoryConfig.description}
              </p>
            </div>
          </div>
        </div>

        {/* Materials Grid */}
        <Card>
          <CardHeader>
            <CardTitle>{categoryMaterials.length} archivos</CardTitle>
            <CardDescription>
              Material disponible para consulta
            </CardDescription>
          </CardHeader>
          <CardContent>
            {categoryMaterials.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Folder className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg">No hay archivos en esta carpeta</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {categoryMaterials.map((material) => {
                  const fileUrl = materialsAPI.getFileUrl(material.fileUrl)
                  const viewUrl = materialsAPI.getViewUrl(material._id)
                  const downloadUrl = materialsAPI.getDownloadUrl(material._id)
                  const token = typeof window !== "undefined" ? localStorage.getItem("token") : ""
                  
                  return (
                    <Card key={material._id} className="overflow-hidden group">
                      <div className="aspect-video bg-secondary flex items-center justify-center relative">
                        {material.fileType === "image" ? (
                          <img 
                            src={fileUrl} 
                            alt={material.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          getFileIcon(material.fileType)
                        )}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <a 
                            href={`${viewUrl}?token=${token}`}
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <Button size="sm" variant="secondary">
                              <Eye className="h-4 w-4 mr-1" />
                              Ver
                            </Button>
                          </a>
                          <a 
                            href={`${downloadUrl}?token=${token}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button size="sm" variant="secondary">
                              <Download className="h-4 w-4" />
                            </Button>
                          </a>
                        </div>
                      </div>
                      <CardContent className="pt-4">
                        <h3 className="font-semibold truncate">{material.name}</h3>
                        {material.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {material.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                          <span>{material.fileName}</span>
                          <span>{formatFileSize(material.fileSize)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

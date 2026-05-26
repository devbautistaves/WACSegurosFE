"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { materialsAPI, MarketingMaterial, MaterialCategory } from "@/lib/api"
import { 
  Folder, 
  Upload, 
  FileImage, 
  FileVideo, 
  FileText, 
  File,
  Download,
  Trash2,
  X,
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

export default function SellerMarketingPage() {
  const router = useRouter()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [materials, setMaterials] = useState<MarketingMaterial[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<MaterialCategory | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [userRole, setUserRole] = useState<string>("")
  
  const [newMaterial, setNewMaterial] = useState({
    name: "",
    description: "",
    file: null as File | null,
  })

  useEffect(() => {
    // Get user role from localStorage
    const user = localStorage.getItem("user")
    if (user) {
      const parsed = JSON.parse(user)
      setUserRole(parsed.role || "seller")
    }
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

  const handleUpload = async () => {
    if (!newMaterial.name || !newMaterial.file || !selectedCategory) {
      toast({
        title: "Error",
        description: "Completa el nombre y selecciona un archivo",
        variant: "destructive",
      })
      return
    }

    try {
      setIsUploading(true)
      const token = localStorage.getItem("token")
      if (!token) return

      const response = await materialsAPI.upload(
        token,
        {
          category: selectedCategory,
          name: newMaterial.name,
          description: newMaterial.description,
        },
        newMaterial.file
      )

      if (response.success) {
        toast({
          title: "Material subido",
          description: "El material se ha subido correctamente",
        })
        setMaterials(prev => [response.material, ...prev])
        setShowUploadModal(false)
        setNewMaterial({ name: "", description: "", file: null })
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "No se pudo subir el material"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const token = localStorage.getItem("token")
      if (!token) return

      const response = await materialsAPI.delete(token, id)
      if (response.success) {
        toast({
          title: "Material eliminado",
          description: "El material se ha eliminado correctamente",
        })
        setMaterials(prev => prev.filter(m => m._id !== id))
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "No se pudo eliminar el material"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
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

  const isAdmin = userRole === "admin"

  if (isLoading) {
    return (
      <DashboardLayout requiredRole="seller">
        <div className="flex items-center justify-center h-[60vh]">
          <Spinner className="h-8 w-8 text-primary" />
        </div>
      </DashboardLayout>
    )
  }

  // Show folder view
  if (!selectedCategory) {
    return (
      <DashboardLayout requiredRole="seller">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-foreground">Marketing</h1>
            <p className="text-muted-foreground">
              Material de marketing y capacitacion
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
    <DashboardLayout requiredRole="seller">
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
          {isAdmin && (
            <Button onClick={() => setShowUploadModal(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Subir Archivo
            </Button>
          )}
        </div>

        {/* Materials Grid */}
        <Card>
          <CardHeader>
            <CardTitle>{categoryMaterials.length} archivos</CardTitle>
            <CardDescription>
              {isAdmin 
                ? "Haz clic en Subir Archivo para agregar nuevo material" 
                : "Material disponible para consulta"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {categoryMaterials.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Folder className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg">No hay archivos en esta carpeta</p>
                {isAdmin && (
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setShowUploadModal(true)}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Subir primer archivo
                  </Button>
                )}
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
                          {isAdmin && (
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={(e) => {
                                e.preventDefault()
                                handleDelete(material._id)
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
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

      {/* Upload Modal */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subir Material a {categoryConfig.label}</DialogTitle>
            <DialogDescription>
              Sube un archivo para agregarlo a esta carpeta
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={newMaterial.name}
                onChange={(e) => setNewMaterial(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nombre del material"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Descripcion (opcional)</Label>
              <Textarea
                id="description"
                value={newMaterial.description}
                onChange={(e) => setNewMaterial(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descripcion del material"
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Archivo</Label>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    setNewMaterial(prev => ({ ...prev, file, name: prev.name || file.name.replace(/\.[^/.]+$/, "") }))
                  }
                }}
              />
              {newMaterial.file ? (
                <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                  <div className="flex items-center gap-2">
                    {getFileIcon(newMaterial.file.type.split("/")[0])}
                    <span className="text-sm truncate max-w-[200px]">{newMaterial.file.name}</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setNewMaterial(prev => ({ ...prev, file: null }))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Seleccionar Archivo
                </Button>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpload} disabled={isUploading}>
              {isUploading ? (
                <>
                  <Spinner className="h-4 w-4 mr-2" />
                  Subiendo...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Subir
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}

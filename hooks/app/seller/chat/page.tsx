"use client"

import { useEffect, useState, useRef } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { chatAPI, usersAPI, ChatRoom, ChatMessage, User } from "@/lib/api"
import { Send, Users, MessageSquare, Shield, MessageCircle } from "lucide-react"
import { cn } from "@/lib/utils"

type ChatType = "group" | "private"

export default function SellerChatPage() {
  const [groupRoom, setGroupRoom] = useState<ChatRoom | null>(null)
  const [privateRooms, setPrivateRooms] = useState<Map<string, ChatRoom>>(new Map())
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null)
  const [selectedChatType, setSelectedChatType] = useState<ChatType>("group")
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [currentUser, setCurrentUser] = useState<{ name: string; _id: string } | null>(null)
  const [admins, setAdmins] = useState<User[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (userData) {
      setCurrentUser(JSON.parse(userData))
    }
    fetchInitialData()
  }, [])

  useEffect(() => {
    if (selectedRoom) {
      fetchMessages(selectedRoom._id)
      const interval = setInterval(() => fetchMessages(selectedRoom._id), 5000)
      return () => clearInterval(interval)
    }
  }, [selectedRoom])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const fetchInitialData = async () => {
    const token = localStorage.getItem("token")
    if (!token) return

    try {
      // Get group chat
      const groupRes = await chatAPI.getGroupChat(token)
      if (groupRes.chatRoom) {
        setGroupRoom(groupRes.chatRoom)
        setSelectedRoom(groupRes.chatRoom)
      }

      // Try to get all users to find admins
      try {
        const usersRes = await usersAPI.getAll(token)
        const adminUsers = usersRes.users.filter(
          (u) => u.role === "admin" && u.isActive
        )
        setAdmins(adminUsers)
      } catch {
        // If seller can't get all users, try the old private-admin endpoint to at least get one admin
        try {
          const privateRes = await chatAPI.getPrivateAdminChat(token)
          if (privateRes.chatRoom) {
            // Create a dummy admin entry
            setAdmins([{ _id: "admin", name: "Administrador", role: "admin", email: "", phone: "", location: "", commissionRate: 0, isActive: true, totalSales: 0, totalCommissions: 0, createdAt: "", updatedAt: "" }])
          }
        } catch {
          // No admins available
        }
      }
    } catch (error) {
      console.error("Error fetching chat data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchMessages = async (roomId: string) => {
    const token = localStorage.getItem("token")
    if (!token) return

    try {
      const response = await chatAPI.getMessages(token, roomId)
      setMessages(response.messages || [])
    } catch (error) {
      console.error("Error fetching messages:", error)
    }
  }

  const handleSelectGroupChat = () => {
    if (groupRoom) {
      setSelectedRoom(groupRoom)
      setSelectedChatType("group")
      setSelectedUser(null)
    }
  }

  const handleSelectPrivateChat = async (user: User) => {
    const token = localStorage.getItem("token")
    if (!token) return

    // Check if we already have the room cached
    if (privateRooms.has(user._id)) {
      setSelectedRoom(privateRooms.get(user._id)!)
      setSelectedChatType("private")
      setSelectedUser(user)
      return
    }

    try {
      // If user._id is "admin" (dummy), use the old endpoint
      if (user._id === "admin") {
        const response = await chatAPI.getPrivateAdminChat(token)
        if (response.chatRoom) {
          setPrivateRooms(prev => new Map(prev).set(user._id, response.chatRoom))
          setSelectedRoom(response.chatRoom)
          setSelectedChatType("private")
          setSelectedUser(user)
        }
      } else {
        const response = await chatAPI.getPrivateChat(token, user._id)
        if (response.room) {
          setPrivateRooms(prev => new Map(prev).set(user._id, response.room))
          setSelectedRoom(response.room)
          setSelectedChatType("private")
          setSelectedUser(user)
        }
      }
    } catch (error) {
      console.error("Error getting private chat:", error)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!newMessage.trim() || !selectedRoom) return

    const token = localStorage.getItem("token")
    if (!token) return

    setIsSending(true)
    try {
      await chatAPI.sendMessage(token, selectedRoom._id, newMessage)
      setNewMessage("")
      await fetchMessages(selectedRoom._id)
    } catch (error) {
      console.error("Error sending message:", error)
    } finally {
      setIsSending(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("es-AR", {
      day: "numeric",
      month: "short",
    })
  }

  // Obtener nombre real del usuario que envio el mensaje
  const getSenderName = (msg: ChatMessage) => {
    if (msg.sender?.name) return msg.sender.name
    if (msg.senderName) return msg.senderName
    return "Usuario"
  }

  // Obtener rol del usuario
  const getSenderRole = (msg: ChatMessage) => {
    if (msg.sender?.role) return msg.sender.role
    return "seller"
  }

  // Verificar si es mensaje propio
  const isOwnMessage = (msg: ChatMessage) => {
    if (!currentUser) return false
    const senderId = msg.senderId || msg.sender?._id
    const senderName = msg.senderName || msg.sender?.name
    return senderId === currentUser._id || senderName === currentUser.name
  }

  // Obtener color del badge segun rol
  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return { label: "Admin", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" }
      case "supervisor":
        return { label: "Supervisor", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" }
      default:
        return { label: "Vendedor", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" }
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout requiredRole="seller">
        <div className="flex items-center justify-center h-[60vh]">
          <Spinner className="h-8 w-8 text-primary" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout requiredRole="seller">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Chat</h1>
          <p className="text-muted-foreground">
            Comunicate con el equipo
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-240px)]">
          {/* Sidebar - Chat List */}
          <Card className="border-border/50 bg-card/50 lg:col-span-1 overflow-hidden">
            <CardHeader className="py-4">
              <CardTitle className="text-lg">Conversaciones</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/50 max-h-[calc(100vh-350px)] overflow-y-auto">
                {/* Group Chat */}
                <div className="p-3">
                  <button
                    onClick={handleSelectGroupChat}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left",
                      selectedChatType === "group"
                        ? "bg-primary/20 border border-primary/30"
                        : "hover:bg-secondary/50"
                    )}
                  >
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        Chat Grupal
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Todo el equipo
                      </p>
                    </div>
                  </button>
                </div>

                {/* Private Chats with Admins */}
                {admins.length > 0 && (
                  <div className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-4 w-4 text-purple-400" />
                      <span className="text-xs font-medium text-purple-400">Chat Privado con Admins</span>
                    </div>
                    <div className="space-y-2">
                      {admins.map((admin) => (
                        <button
                          key={admin._id}
                          onClick={() => handleSelectPrivateChat(admin)}
                          className={cn(
                            "w-full flex items-center gap-2 p-2 rounded-lg transition-colors text-left",
                            selectedUser?._id === admin._id
                              ? "bg-purple-500/20 border border-purple-500/30"
                              : "bg-purple-500/5 hover:bg-purple-500/10"
                          )}
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-purple-500/20 text-purple-400 text-xs">
                              {getInitials(admin.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{admin.name}</p>
                            <p className="text-xs text-muted-foreground">Administrador</p>
                          </div>
                          <MessageCircle className="h-4 w-4 text-muted-foreground" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {!groupRoom && admins.length === 0 && (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    No hay conversaciones disponibles
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Chat Area */}
          <Card className="border-border/50 bg-card/50 lg:col-span-3 flex flex-col overflow-hidden">
            {selectedRoom ? (
              <>
                {/* Chat Header */}
                <CardHeader className="py-4 border-b border-border/50">
                  <div className="flex items-center gap-3">
                    {selectedChatType === "group" ? (
                      <>
                        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">Chat Grupal</CardTitle>
                          <p className="text-xs text-muted-foreground">
                            Todo el equipo
                          </p>
                        </div>
                      </>
                    ) : selectedUser && (
                      <>
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-purple-500/20 text-purple-400">
                            {getInitials(selectedUser.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg">{selectedUser.name}</CardTitle>
                          <Badge variant="outline" className="text-xs bg-purple-500/20 text-purple-400 border-purple-500/30">
                            Administrador
                          </Badge>
                        </div>
                      </>
                    )}
                  </div>
                </CardHeader>

                {/* Messages */}
                <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mb-2 opacity-50" />
                      <p>No hay mensajes aun</p>
                      <p className="text-sm">Envia el primer mensaje</p>
                    </div>
                  ) : (
                    messages.map((msg, index) => {
                      const senderName = getSenderName(msg)
                      const senderRole = getSenderRole(msg)
                      const ownMessage = isOwnMessage(msg)
                      const roleBadge = getRoleBadge(senderRole)
                      const showDate =
                        index === 0 ||
                        formatDate(msg.createdAt) !==
                          formatDate(messages[index - 1].createdAt)

                      return (
                        <div key={msg._id}>
                          {showDate && (
                            <div className="flex items-center justify-center my-4">
                              <span className="text-xs text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full">
                                {formatDate(msg.createdAt)}
                              </span>
                            </div>
                          )}
                          <div
                            className={cn(
                              "flex gap-3",
                              ownMessage && "flex-row-reverse"
                            )}
                          >
                            <Avatar className="h-8 w-8 flex-shrink-0">
                              <AvatarFallback
                                className={cn(
                                  "text-xs",
                                  senderRole === "admin" && "bg-purple-500/20 text-purple-400",
                                  senderRole === "supervisor" && "bg-amber-500/20 text-amber-400",
                                  senderRole === "seller" && "bg-blue-500/20 text-blue-400"
                                )}
                              >
                                {getInitials(senderName)}
                              </AvatarFallback>
                            </Avatar>
                            <div
                              className={cn(
                                "max-w-[70%] rounded-2xl px-4 py-2",
                                ownMessage
                                  ? "bg-primary text-primary-foreground rounded-tr-sm"
                                  : "bg-secondary/50 text-foreground rounded-tl-sm"
                              )}
                            >
                              {!ownMessage && selectedChatType === "group" && (
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="text-xs font-medium opacity-90">
                                    {senderName}
                                  </p>
                                  <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", roleBadge.color)}>
                                    {roleBadge.label}
                                  </Badge>
                                </div>
                              )}
                              <p className="text-sm">{msg.content}</p>
                              <p
                                className={cn(
                                  "text-xs mt-1",
                                  ownMessage
                                    ? "text-primary-foreground/70"
                                    : "text-muted-foreground"
                                )}
                              >
                                {formatTime(msg.createdAt)}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                  <div ref={messagesEndRef} />
                </CardContent>

                {/* Message Input */}
                <div className="p-4 border-t border-border/50">
                  <div className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault()
                          handleSendMessage(e)
                        }
                      }}
                      placeholder="Escribe un mensaje..."
                      className="flex-1 bg-secondary/50"
                      disabled={isSending}
                    />
                    <Button
                      type="button"
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || isSending}
                      className="bg-primary text-primary-foreground"
                    >
                      {isSending ? (
                        <Spinner className="h-4 w-4" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                <MessageSquare className="h-16 w-16 mb-4 opacity-50" />
                <p className="text-lg font-medium">Selecciona una conversacion</p>
                <p className="text-sm">Elige un chat de la lista para comenzar</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}

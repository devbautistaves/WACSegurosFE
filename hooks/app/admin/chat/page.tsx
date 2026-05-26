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
import { Send, Users, MessageSquare, Shield, UserCheck, UserCircle, MessageCircle } from "lucide-react"
import { cn } from "@/lib/utils"

type ChatType = "group" | "private"

export default function AdminChatPage() {
  const [groupRoom, setGroupRoom] = useState<ChatRoom | null>(null)
  const [privateRooms, setPrivateRooms] = useState<Map<string, ChatRoom>>(new Map())
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null)
  const [selectedChatType, setSelectedChatType] = useState<ChatType>("group")
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
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
      const [groupRes, usersRes, profileRes] = await Promise.all([
        chatAPI.getGroupChat(token),
        usersAPI.getAll(token),
        usersAPI.getProfile(token),
      ])

      if (groupRes.chatRoom) {
        setGroupRoom(groupRes.chatRoom)
        setSelectedRoom(groupRes.chatRoom)
      }
      setUsers(usersRes.users || [])
      setCurrentUser(profileRes.user || null)
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

    // Verificar si ya tenemos la sala en cache
    if (privateRooms.has(user._id)) {
      setSelectedRoom(privateRooms.get(user._id)!)
      setSelectedChatType("private")
      setSelectedUser(user)
      return
    }

    try {
      const response = await chatAPI.getPrivateChat(token, user._id)
      if (response.room) {
        setPrivateRooms(prev => new Map(prev).set(user._id, response.room))
        setSelectedRoom(response.room)
        setSelectedChatType("private")
        setSelectedUser(user)
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
    if (msg.senderId) {
      const user = users.find(u => u._id === msg.senderId)
      if (user) return user.name
    }
    if (msg.sender?._id) {
      const user = users.find(u => u._id === msg.sender?._id)
      if (user) return user.name
    }
    return "Usuario"
  }

  // Obtener rol del usuario
  const getSenderRole = (msg: ChatMessage) => {
    if (msg.sender?.role) return msg.sender.role
    if (msg.senderId) {
      const user = users.find(u => u._id === msg.senderId)
      if (user) return user.role
    }
    if (msg.sender?._id) {
      const user = users.find(u => u._id === msg.sender?._id)
      if (user) return user.role
    }
    return "seller"
  }

  // Verificar si es mensaje propio
  const isOwnMessage = (msg: ChatMessage) => {
    if (!currentUser) return false
    if (msg.senderId === currentUser._id) return true
    if (msg.sender?._id === currentUser._id) return true
    return false
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

  // Agrupar usuarios por rol (excluyendo al usuario actual)
  const otherAdmins = users.filter(u => u.role === "admin" && u.isActive && u._id !== currentUser?._id)
  const supervisors = users.filter(u => u.role === "supervisor" && u.isActive)
  const sellers = users.filter(u => u.role === "seller" && u.isActive)

  if (isLoading) {
    return (
      <DashboardLayout requiredRole="admin">
        <div className="flex items-center justify-center h-[60vh]">
          <Spinner className="h-8 w-8 text-primary" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout requiredRole="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Chat</h1>
          <p className="text-muted-foreground">
            Comunicate con el equipo de forma grupal o privada
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-240px)]">
          {/* Sidebar - User List */}
          <Card className="border-border/50 bg-card/50 lg:col-span-1 overflow-hidden">
            <CardHeader className="py-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Conversaciones
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-y-auto max-h-[calc(100vh-350px)]">
              <div className="divide-y divide-border/50">
                {/* Chat Grupal */}
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
                      <p className="font-medium text-foreground">Chat Grupal</p>
                      <p className="text-xs text-muted-foreground">Todo el equipo</p>
                    </div>
                  </button>
                </div>

                {/* Otros Admins */}
                {otherAdmins.length > 0 && (
                  <div className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-4 w-4 text-purple-400" />
                      <span className="text-xs font-medium text-purple-400">Administradores ({otherAdmins.length})</span>
                    </div>
                    <div className="space-y-2">
                      {otherAdmins.map((user) => (
                        <button
                          key={user._id}
                          onClick={() => handleSelectPrivateChat(user)}
                          className={cn(
                            "w-full flex items-center gap-2 p-2 rounded-lg transition-colors text-left",
                            selectedUser?._id === user._id 
                              ? "bg-purple-500/20 border border-purple-500/30" 
                              : "bg-purple-500/5 hover:bg-purple-500/10"
                          )}
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-purple-500/20 text-purple-400 text-xs">
                              {getInitials(user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                          </div>
                          <MessageCircle className="h-4 w-4 text-muted-foreground" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Supervisors */}
                {supervisors.length > 0 && (
                  <div className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <UserCheck className="h-4 w-4 text-amber-400" />
                      <span className="text-xs font-medium text-amber-400">Supervisores ({supervisors.length})</span>
                    </div>
                    <div className="space-y-2">
                      {supervisors.map((user) => (
                        <button
                          key={user._id}
                          onClick={() => handleSelectPrivateChat(user)}
                          className={cn(
                            "w-full flex items-center gap-2 p-2 rounded-lg transition-colors text-left",
                            selectedUser?._id === user._id 
                              ? "bg-amber-500/20 border border-amber-500/30" 
                              : "bg-amber-500/5 hover:bg-amber-500/10"
                          )}
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-amber-500/20 text-amber-400 text-xs">
                              {getInitials(user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                          </div>
                          <MessageCircle className="h-4 w-4 text-muted-foreground" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sellers */}
                {sellers.length > 0 && (
                  <div className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <UserCircle className="h-4 w-4 text-blue-400" />
                      <span className="text-xs font-medium text-blue-400">Vendedores ({sellers.length})</span>
                    </div>
                    <div className="space-y-2">
                      {sellers.map((user) => (
                        <button
                          key={user._id}
                          onClick={() => handleSelectPrivateChat(user)}
                          className={cn(
                            "w-full flex items-center gap-2 p-2 rounded-lg transition-colors text-left",
                            selectedUser?._id === user._id 
                              ? "bg-blue-500/20 border border-blue-500/30" 
                              : "bg-blue-500/5 hover:bg-blue-500/10"
                          )}
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-blue-500/20 text-blue-400 text-xs">
                              {getInitials(user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{user.location}</p>
                          </div>
                          <MessageCircle className="h-4 w-4 text-muted-foreground" />
                        </button>
                      ))}
                    </div>
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
                          <CardTitle className="text-lg">Chat Grupal del Equipo</CardTitle>
                          <p className="text-xs text-muted-foreground">
                            {users.filter(u => u.isActive).length} participantes activos
                          </p>
                        </div>
                      </>
                    ) : selectedUser && (
                      <>
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className={cn(
                            selectedUser.role === "admin" && "bg-purple-500/20 text-purple-400",
                            selectedUser.role === "supervisor" && "bg-amber-500/20 text-amber-400",
                            selectedUser.role === "seller" && "bg-blue-500/20 text-blue-400"
                          )}>
                            {getInitials(selectedUser.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg">{selectedUser.name}</CardTitle>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={cn("text-xs", getRoleBadge(selectedUser.role).color)}>
                              {getRoleBadge(selectedUser.role).label}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{selectedUser.email}</span>
                          </div>
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
                <p className="text-sm">Elige un chat grupal o un usuario para comenzar</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}

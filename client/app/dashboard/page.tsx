"use client"

import { useEffect } from "react"
import { useTRPC } from "@/utils/trpc"
import { useState, useRef } from "react"
import { useMutation } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { authClient } from "@/lib/auth-client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { UploadCloud, X, FileVideo, Loader2, CheckCircle2, AlertCircle } from "lucide-react"

export default function Dashboard() {
  const router = useRouter()
  const trpc = useTRPC()
  const { data: session, isPending } = authClient.useSession()

  const [isDragging, setIsDragging] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [uploadProgress, setUploadProgress] = useState<"idle" | "signing" | "uploading" | "done">("idle")
  const [uploadNotice, setUploadNotice] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const resetUploadProgressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isUploading = uploadProgress === "signing" || uploadProgress === "uploading"

  const getUploadUrl = useMutation(
    trpc.v1.video.getUploadUrl.mutationOptions()
  )


  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login")
    }
  }, [session, isPending, router])

  useEffect(() => {
    return () => {
      if (resetUploadProgressTimerRef.current) {
        clearTimeout(resetUploadProgressTimerRef.current)
      }
    }
  }, [])

  const handleLogout = async () => {
    await authClient.signOut()
    router.push("/login")
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (isUploading) return
    setIsDragging(false)
    setUploadNotice(null)
    const dropped = Array.from(e.dataTransfer.files).slice(0, 1)
    setFiles(dropped)
  }

  const handleBrowse = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isUploading) return
    setUploadNotice(null)
    const selected = Array.from(e.target.files || []).slice(0, 1)
    setFiles(selected)
  }

  const removeFile = (index: number) => {
    if (isUploading) return
    setUploadNotice(null)
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const clearSelectedFiles = () => {
    setFiles([])
    if (inputRef.current) {
      inputRef.current.value = ""
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!files[0] || !title || isUploading) return

    if (resetUploadProgressTimerRef.current) {
      clearTimeout(resetUploadProgressTimerRef.current)
      resetUploadProgressTimerRef.current = null
    }

    const file = files[0]

    try {
      setUploadNotice(null)
      setUploadProgress("signing")
      const result = await getUploadUrl.mutateAsync({
        fileName: file.name,
        fileType: file.type,
        title,
        description,
      })

      setUploadProgress("uploading")
      await fetch(result.presignedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      })

      setUploadProgress("done")
      setUploadNotice({
        type: "success",
        message: "Video uploaded successfully.",
      })
      clearSelectedFiles()
      resetUploadProgressTimerRef.current = setTimeout(() => {
        setUploadProgress("idle")
      }, 1200)
      console.log("Uploaded! S3 key:", result.key)

    } catch (err) {
      console.error("Upload failed:", err)
      setUploadNotice({
        type: "error",
        message: err instanceof Error ? err.message : "Upload failed. Please try again.",
      })
      setUploadProgress("idle")
    }
  }

  const uploadLabel = {
    idle: "Upload",
    signing: "Preparing...",
    uploading: "Uploading...",
    done: "Done!",
  }[uploadProgress]

  if (isPending || !session) return null

  return (
    <div className="min-h-screen bg-background">

      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <p className="text-sm font-medium text-muted-foreground">
          Hi, <span className="text-foreground font-semibold">{session.user.name}</span>!!
        </p>
        <Button variant="destructive" size="sm" onClick={handleLogout}>
          Logout
        </Button>
      </div>

      {/* Centered form */}
      <div className="flex items-center justify-center px-4 py-16">
        <Card className="w-full max-w-lg border shadow-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl font-semibold">Upload Your Details</CardTitle>
            <CardDescription>Fill in the details and upload your file below.</CardDescription>
          </CardHeader>

          <CardContent>
            <form className="space-y-5" onSubmit={handleSubmit}>

              {/* Title */}
              <div className="space-y-1.5">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Enter a title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Enter a description..."
                  rows={3}
                  className="resize-none"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Drag & Drop */}
              <div className="space-y-1.5">
                <Label>File</Label>
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => {
                    if (!isUploading) {
                      inputRef.current?.click()
                    }
                  }}
                  className={`
                    flex flex-col items-center justify-center gap-2
                    rounded-lg border-2 border-dashed p-8
                    transition-colors cursor-pointer
                    ${isUploading ? "pointer-events-none opacity-60" : ""}
                    ${isDragging
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/30"
                    }
                  `}
                >
                  <div className="rounded-full border p-3">
                    <UploadCloud className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">Drop Your Video</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Up to 1 file only</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isUploading}
                    onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}
                  >
                    Browse
                  </Button>
                  <input
                    ref={inputRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    disabled={isUploading}
                    onChange={handleBrowse}
                  />
                </div>

                {/* File list */}

                {files.length > 0 && (
                  <ul className="mt-2 space-y-1.5">
                    {files.map((file, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileVideo className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="truncate text-muted-foreground">{file.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          disabled={isUploading}
                          className="ml-2 shrink-0 text-muted-foreground hover:text-destructive transition-colors disabled:pointer-events-none disabled:opacity-50"
                        >
                          <X className="h-4 w-4 cursor-pointer" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isUploading || files.length === 0 || !title}
              >
                {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {uploadLabel}
              </Button>

              {uploadNotice && (
                <Alert variant={uploadNotice.type === "error" ? "destructive" : "default"}>
                  {uploadNotice.type === "success" ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <AlertTitle>
                    {uploadNotice.type === "success" ? "Upload Completed" : "Upload failed"}
                  </AlertTitle>
                  <AlertDescription>{uploadNotice.message}</AlertDescription>
                </Alert>
              )}

            </form>
          </CardContent>
        </Card>
      </div>

    </div>
  )
}

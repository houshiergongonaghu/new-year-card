"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Dices, Sparkles, Send, Upload, Loader2 } from "lucide-react"
import { drawCardToCanvas } from "@/lib/canvas-utils"

const illustrations = [
  "/watercolor-bunny-in-winter-scene.jpg",
  "/vintage-cardinal-bird-on-snowy-branch.jpg",
  "/cozy-winter-cottage-with-smoke.jpg",
  "/hand-painted-christmas-wreath.jpg",
  "/watercolor-deer-in-snow.jpg",
]

export default function HolidayCardGenerator() {
  const [currentIllustration, setCurrentIllustration] = useState(0)
  const [formData, setFormData] = useState({
    yourName: "",
    yourEmail: "",
    recipientName: "",
    recipientEmail: "",
    message: "",
  })
  const [uploadedImage, setUploadedImage] = useState<File | null>(null)
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isCreatingCard, setIsCreatingCard] = useState(false)
  const [aiError, setAiError] = useState('')
  const [cardError, setCardError] = useState('')
  const [finalCardUrl, setFinalCardUrl] = useState<string | null>(null)

  // 页面加载时打印日志
  if (typeof window !== "undefined") {
    console.log("[HolidayCardGenerator] 页面组件已加载,当前图片索引:", currentIllustration)
  }

  const paintAgain = () => {
    setCurrentIllustration((prev) => {
      const next = (prev + 1) % illustrations.length
      console.log(`[paintAgain] 图片切换: ${prev} -> ${next}, 使用图片: ${illustrations[next]}`)
      return next
    })
  }

  const startOver = () => {
    console.log("[startOver] 表单重置,清除所有数据,重置图片索引到0")
    setFormData({
      yourName: "",
      yourEmail: "",
      recipientName: "",
      recipientEmail: "",
      message: "",
    })
    setCurrentIllustration(0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log("[handleSubmit] 开始发送贺卡流程...")

    // 验证所需数据
    if (!formData.yourName || !formData.recipientName || !formData.recipientEmail || !formData.message) {
      alert('请填写完整的贺卡信息（包括收件人邮箱）')
      return
    }

    if (!finalCardUrl) {
      alert('请先点击"生成贺卡"按钮创建贺卡')
      return
    }

    try {
      console.log('[SendCard] 第一步: 保存贺卡到数据库...')

      // 1. 保存到数据库
      const saveResponse = await fetch('/api/save/card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          senderName: formData.yourName,
          recipientName: formData.recipientName,
          recipientEmail: formData.recipientEmail,
          message: formData.message,
          imageUrl: finalCardUrl,
        }),
      })

      const saveResult = await saveResponse.json()
      console.log('[SendCard] 数据库保存结果:', saveResult)

      if (!saveResult.success) {
        alert('保存贺卡失败: ' + (saveResult.message || '未知错误'))
        return
      }

      const cardId = saveResult.data.cardId
      console.log('[SendCard] 贺卡ID:', cardId)

      // 2. 生成查看链接
      const cardUrl = `${window.location.origin}/card/${cardId}`
      console.log('[SendCard] 贺卡链接:', cardUrl)

      console.log('[SendCard] 第二步: 发送邮件通知...')

      // 3. 发送邮件
      const emailResponse = await fetch('/api/send/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientName: formData.recipientName,
          recipientEmail: formData.recipientEmail,
          senderName: formData.yourName,
          cardUrl: cardUrl,
        }),
      })

      const emailResult = await emailResponse.json()
      console.log('[SendCard] 邮件发送结果:', emailResult)

      if (!emailResult.success) {
        alert('邮件发送失败: ' + (emailResult.message || '未知错误'))
        return
      }

      console.log('[SendCard] 贺卡发送成功!')
      alert(`贺卡发送成功! 🎉\n\n${formData.recipientName} (${formData.recipientEmail}) 将收到一封包含贺卡链接的邮件。`)

      // 可选: 清空表单
      // startOver()

    } catch (error) {
      console.error('[SendCard] 发送失败:', error)
      alert('发送失败，请稍后重试')
    }
  }
  
  const handleCreateCard = async () => {
    if (!formData.yourName || !formData.recipientName || !formData.message) {
      setCardError('请填写完整的发送人、收件人和祝福语')
      return
    }
    
    if (!generatedImage && !uploadedImage) {
      setCardError('请先生成AI图片或上传图片')
      return
    }
    
    setIsCreatingCard(true)
    setCardError('')
    setFinalCardUrl(null)
    
    console.log('[CreateCard] 开始创建贺卡...')
    
    try {
      // 使用生成的图片或上传的图片
      const imageToUse = generatedImage || (
        uploadedImage ? URL.createObjectURL(uploadedImage) : illustrations[currentIllustration]
      )
      
      console.log('[CreateCard] 使用图片:', imageToUse)
      
      // 1. Canvas绘制
      const canvasDataUrl = await drawCardToCanvas(
        imageToUse,
        formData.yourName,
        formData.recipientName,
        formData.message
      )
      
      console.log('[CreateCard] Canvas绘制完成')
      
      // 2. 上传到Supabase
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: canvasDataUrl }),
      })
      
      const result = await response.json()
      
      if (result.success) {
        setFinalCardUrl(result.data.imageUrl)
        console.log('[CreateCard] 上传成功:', result.data.imageUrl)
        alert('贺卡创建成功!可以在数据库中保存了')
      } else {
        setCardError(result.message || '上传失败')
        console.error('[CreateCard] 上传失败:', result)
      }
    } catch (error) {
      console.error('[CreateCard] 错误:', error)
      setCardError('创建贺卡失败，请重试')
    } finally {
      setIsCreatingCard(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] py-8 px-4 sm:py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <form onSubmit={handleSubmit}>
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Left Column - Preview */}
            <div>
              <Card className="overflow-hidden rounded-2xl border-2 border-[#8B9B87] bg-white shadow-xl">
                <CardContent className="p-6 sm:p-8">
                  <h2 className="font-serif text-3xl font-bold text-[#8B9B87] text-center mb-6 text-balance">
                    Season's Greetings
                  </h2>

                  <div className="aspect-[4/3] overflow-hidden rounded-lg bg-[#F5F1E8] mb-6">
                    {generatedImage ? (
                      <img
                        src={generatedImage}
                        alt="Generated AI illustration"
                        className="h-full w-full object-cover"
                      />
                    ) : uploadedImage ? (
                      <img
                        src={URL.createObjectURL(uploadedImage)}
                        alt="User uploaded"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <img
                        src={illustrations[currentIllustration] || "/placeholder.svg"}
                        alt="Holiday illustration"
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>

                  <div className="space-y-3">
                    <Button
                      type="button"
                      onClick={() => document.getElementById('image-upload')?.click()}
                      className="w-full rounded-full bg-[#6B8E5A] hover:bg-[#5A7A4A] text-white font-medium"
                      disabled={isGenerating}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      上传您的照片
                    </Button>
                    <input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          setUploadedImage(file)
                          setGeneratedImage(null)
                          setAiError('')
                          console.log(`[上传] 选择了图片: ${file.name}`)
                        }
                      }}
                    />
                    
                    <Button
                      type="button"
                      onClick={async () => {
                        if (!uploadedImage) {
                          alert('请先上传一张图片');
                          return;
                        }
                        
                        setIsGenerating(true);
                        setAiError('');
                        setGeneratedImage(null);
                        console.log('[AI生成] 开始生成水彩风格图片...');
                        
                        const formData = new FormData();
                        formData.append('image', uploadedImage);
                        
                        try {
                          const response = await fetch('/api/generate', {
                            method: 'POST',
                            body: formData,
                          });
                          
                          const result = await response.json();
                          console.log('[AI生成] 响应:', result);
                          
                          if (result.success) {
                            setGeneratedImage(result.data.imageUrl);
                            console.log('[AI生成] 成功:', result.data.imageUrl);
                          } else {
                            setAiError(result.message || '生成失败');
                            console.error('[AI生成] 失败:', result);
                          }
                        } catch (error) {
                          console.error('[AI生成] 错误:', error);
                          setAiError('生成出错，请重试');
                        } finally {
                          setIsGenerating(false);
                        }
                      }}
                      className="w-full rounded-full bg-[#8B9B87] hover:bg-[#6F7F6B] text-white font-medium"
                      disabled={isGenerating || !uploadedImage}
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          AI生成中...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          AI生成水彩风格
                        </>
                      )}
                    </Button>
                    
                    {aiError && (
                      <div className="text-red-600 text-sm text-center">{aiError}</div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      onClick={paintAgain}
                      className="flex-1 rounded-full bg-[#8B9B87] hover:bg-[#6F7F6B] text-white font-medium"
                    >
                      <Dices className="mr-2 h-4 w-4" />
                      Paint Again
                    </Button>
                    <Button
                      type="button"
                      onClick={startOver}
                      variant="outline"
                      className="flex-1 rounded-full border-2 border-[#8B9B87] text-[#8B9B87] hover:bg-[#8B9B87] hover:text-white font-medium bg-transparent"
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      Start Over
                    </Button>
                  </div>
                </CardContent>
              </Card>
              <div className="mt-6 hidden lg:flex justify-start">
                <div className="rounded-2xl bg-white/90 p-3 shadow-lg ring-1 ring-black/5 ml-[150px]">
                  <img
                    src="/support-qr.jpg"
                    alt="Support QR code"
                    className="h-[130px] w-[130px] rounded-xl object-cover"
                  />
                </div>
              </div>
            </div>

            {/* Right Column - Form */}
            <div>
              <Card className="overflow-hidden rounded-2xl border-2 border-[#8B9B87] bg-white shadow-xl">
                <CardContent className="p-6 sm:p-8">
                  <h2 className="font-serif text-2xl font-bold text-[#4A5946] mb-6">Card Details</h2>

                  {/* From You Section */}
                  <div className="mb-6">
                    <h3 className="font-serif text-lg font-semibold text-[#4A5946] mb-3">From You</h3>
                    <div className="space-y-3">
                      <Input
                        type="text"
                        placeholder="Your name"
                        value={formData.yourName}
                        onChange={(e) => setFormData({ ...formData, yourName: e.target.value })}
                        className="rounded-lg border-2 border-[#E5DCC8] focus:border-[#8B9B87] bg-[#FDFBF7]"
                        required
                      />
                      <Input
                        type="email"
                        placeholder="Your email"
                        value={formData.yourEmail}
                        onChange={(e) => setFormData({ ...formData, yourEmail: e.target.value })}
                        className="rounded-lg border-2 border-[#E5DCC8] focus:border-[#8B9B87] bg-[#FDFBF7]"
                        required
                      />
                    </div>
                  </div>

                  {/* To Someone Special Section */}
                  <div className="mb-6">
                    <h3 className="font-serif text-lg font-semibold text-[#4A5946] mb-3">To Someone Special</h3>
                    <div className="space-y-3">
                      <Input
                        type="text"
                        placeholder="Recipient's name"
                        value={formData.recipientName}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            recipientName: e.target.value,
                          })
                        }
                        className="rounded-lg border-2 border-[#E5DCC8] focus:border-[#8B9B87] bg-[#FDFBF7]"
                        required
                      />
                      <Input
                        type="email"
                        placeholder="Recipient's email"
                        value={formData.recipientEmail}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            recipientEmail: e.target.value,
                          })
                        }
                        className="rounded-lg border-2 border-[#E5DCC8] focus:border-[#8B9B87] bg-[#FDFBF7]"
                        required
                      />
                    </div>
                  </div>

                  {/* Your Message Section */}
                  <div className="mb-6">
                    <h3 className="font-serif text-lg font-semibold text-[#4A5946] mb-3">Your Message</h3>
                    <Textarea
                      placeholder="Write your heartfelt holiday message here..."
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="min-h-[150px] rounded-lg border-2 border-[#E5DCC8] focus:border-[#8B9B87] bg-[#FDFBF7] resize-none"
                      required
                    />
                  </div>

                  {/* Create Card Button */}
                  <Button
                    type="button"
                    onClick={handleCreateCard}
                    className="w-full rounded-full bg-[#8B9B87] hover:bg-[#6F7F6B] text-white font-semibold text-lg py-6 mb-4"
                    disabled={isCreatingCard}
                  >
                    {isCreatingCard ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-4 animate-spin" />
                        创建贺卡中...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-5 w-5" />
                        生成贺卡
                      </>
                    )}
                  </Button>

                  {/* Send Button */}
                  <Button
                    type="submit"
                    className="w-full rounded-full bg-[#B91C1C] hover:bg-[#991B1B] text-white font-semibold text-lg py-6"
                  >
                    <Send className="mr-2 h-5 w-5" />
                    Send with Love
                  </Button>
                  
                  {cardError && (
                    <div className="text-red-600 text-sm text-center mt-3">{cardError}</div>
                  )}
                </CardContent>
              </Card>
              <div className="mt-6 flex justify-center lg:hidden">
                <div className="rounded-2xl bg-white/90 p-3 shadow-lg ring-1 ring-black/5">
                  <img
                    src="/support-qr.jpg"
                    alt="Support QR code"
                    className="h-[160px] w-[160px] rounded-xl object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <footer className="mt-8 text-center">
          <p className="font-serif text-sm text-[#8B9B87] italic">Made with love ✨</p>
        </footer>
      </div>
    </div>
  )
}

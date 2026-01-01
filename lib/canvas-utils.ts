export function drawCardToCanvas(
  imageUrl: string,
  senderName: string,
  recipientName: string,
  message: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      reject(new Error('Canvas not supported'))
      return
    }

    // Max dimensions while keeping aspect
    const MAX_W = 900
    const MAX_H = 900

    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      try {
        // Scale canvas to image ratio (cap to MAX)
        const scale = Math.min(MAX_W / img.width, MAX_H / img.height, 1)
        const drawW = Math.round(img.width * scale)
        const drawH = Math.round(img.height * scale)

        canvas.width = drawW
        canvas.height = drawH

        // Padding and layout
        const pad = Math.round(Math.min(drawW, drawH) * 0.02)
        const contentW = drawW - pad * 2
        const contentH = drawH - pad * 2
        const topH = contentH * 0.82
        const bottomH = contentH - topH
        // 额外预留顶部空隙，避免文字紧贴图片
        const extraTop = Math.max(Math.round(Math.min(drawW, drawH) * 0.05), pad * 2)
        const topY = pad + extraTop
        const bottomY = pad + topH

        // Background
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, drawW, drawH)

        // Main image (top area, centered, keep aspect)
        const imgScale = Math.min(contentW / img.width, topH / img.height)
        const scaledW = img.width * imgScale
        const scaledH = img.height * imgScale
        const imgX = pad + (contentW - scaledW) / 2
        const gapTop = Math.min(pad * 2.5, Math.max(0, topH - scaledH) * 0.6)
        const imgY = topY + gapTop + Math.max(0, (topH - gapTop - scaledH) / 2)
        ctx.drawImage(img, imgX, imgY, scaledW, scaledH)

        // Bottom area
        ctx.fillStyle = '#F5F1E8'
        ctx.fillRect(pad, bottomY, contentW, bottomH)

        // Subtle separator line
        ctx.strokeStyle = 'rgba(0,0,0,0.08)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(pad, bottomY)
        ctx.lineTo(drawW - pad, bottomY)
        ctx.stroke()

        // Border
        ctx.strokeStyle = 'rgba(196,154,108,0.6)' // soft gold
        ctx.lineWidth = 1.5
        ctx.strokeRect(pad / 2, pad / 2, drawW - pad, drawH - pad)

        // Text styles
        const deepRed = '#8B1A1A'
        const maxTextWidth = contentW * 0.9

        // Helper to fit text width
        const fitFont = (text: string, basePx: number, family: string) => {
          let size = basePx
          ctx.font = `${Math.round(size)}px ${family}`
          while (ctx.measureText(text).width > maxTextWidth && size > basePx * 0.55) {
            size -= 1
            ctx.font = `${Math.round(size)}px ${family}`
          }
          return ctx.font
        }

        // Main greeting
        ctx.fillStyle = deepRed
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.font = fitFont('Happy New Year 2026', bottomH * 0.18, '"Great Vibes", cursive')
        ctx.fillText('Happy New Year 2026', pad + contentW / 2, bottomY + bottomH * 0.42)

        // Custom message (optional)
        if (message) {
          ctx.font = fitFont(message, bottomH * 0.12, '"Caveat", cursive')
          ctx.fillText(message, pad + contentW / 2, bottomY + bottomH * 0.63)
        }

        // Recipient (upper-left, above the image area)
        // "Dear ..." 放在上方留白区，并加浅底避免被背景淹没
        const dearText = `Dear ${recipientName},`
        ctx.font = fitFont(dearText, bottomH * 0.14, '"Georgia", serif')
        ctx.textAlign = 'left'
        const dearX = pad + contentW * 0.03
        const dearY = pad * 1.8
        const dearMetrics = ctx.measureText(dearText)
        const dearHeight = dearMetrics.actualBoundingBoxAscent + dearMetrics.actualBoundingBoxDescent
        ctx.fillStyle = 'rgba(255,255,255,0.8)'
        ctx.fillRect(
          dearX - pad * 0.3,
          dearY - dearHeight,
          dearMetrics.width + pad * 0.6,
          dearHeight + pad * 0.4
        )
        ctx.fillStyle = deepRed
        ctx.fillText(dearText, dearX, dearY)

        // Sender (lower-right, italic)
        ctx.font = fitFont(`With warm wishes, ${senderName}`, bottomH * 0.12, '"Georgia", serif')
        ctx.textAlign = 'right'
        ctx.fillText(`With warm wishes, ${senderName}`, pad + contentW * 0.97, bottomY + bottomH * 0.9)

        const dataURL = canvas.toDataURL('image/jpeg', 0.9)
        resolve(dataURL)
      } catch (error) {
        reject(error)
      }
    }

    img.onerror = () => {
      reject(new Error('Failed to load image'))
    }

    img.src = imageUrl
  })
}

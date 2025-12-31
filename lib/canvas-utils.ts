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

    // Dynamic canvas size: keep aspect ratio, cap longest side
    const MAX_W = 900
    const MAX_H = 900

    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      try {
        const scale = Math.min(MAX_W / img.width, MAX_H / img.height, 1)
        const drawW = Math.round(img.width * scale)
        const drawH = Math.round(img.height * scale)

        canvas.width = drawW
        canvas.height = drawH

        // 1. Background image (keep aspect ratio)
        ctx.drawImage(img, 0, 0, drawW, drawH)

        // 2. Title
        ctx.font = `bold ${Math.round(drawH * 0.09)}px "Great Vibes", cursive`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)'
        ctx.lineWidth = Math.max(2, Math.round(drawH * 0.008))
        const titleY = drawH * 0.12
        ctx.strokeText("Season's Greetings", drawW / 2, titleY)
        ctx.fillStyle = '#8B4513'
        ctx.fillText("Season's Greetings", drawW / 2, titleY)

        // 3. Message (auto wrap)
        ctx.fillStyle = '#FFFFFF'
        ctx.font = `${Math.round(drawH * 0.055)}px "Caveat", cursive`
        ctx.textAlign = 'center'
        ctx.strokeStyle = '#8B4513'
        ctx.lineWidth = Math.max(1.5, Math.round(drawH * 0.004))

        const maxWidth = drawW - drawW * 0.12
        const lineHeight = Math.round(drawH * 0.065)
        const words = message.split(' ')
        let line = ''
        let y = drawH * 0.45

        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' '
          const metrics = ctx.measureText(testLine)

          if (metrics.width > maxWidth && n > 0) {
            ctx.strokeText(line, drawW / 2, y)
            ctx.fillText(line, drawW / 2, y)
            line = words[n] + ' '
            y += lineHeight
          } else {
            line = testLine
          }
        }
        ctx.strokeText(line, drawW / 2, y)
        ctx.fillText(line, drawW / 2, y)

        // 4. Sender
        ctx.fillStyle = '#FFFFFF'
        ctx.font = `${Math.round(drawH * 0.05)}px "Caveat", cursive`
        ctx.textAlign = 'right'
        ctx.strokeStyle = '#8B4513'
        ctx.lineWidth = Math.max(1.5, Math.round(drawH * 0.004))
        ctx.strokeText(`— ${senderName}`, drawW - drawW * 0.06, drawH - drawH * 0.07)
        ctx.fillText(`— ${senderName}`, drawW - drawW * 0.06, drawH - drawH * 0.07)

        // 5. Recipient
        ctx.fillStyle = '#FFFFFF'
        ctx.font = `${Math.round(drawH * 0.065)}px "Great Vibes", cursive`
        ctx.textAlign = 'center'
        ctx.strokeStyle = '#8B4513'
        ctx.lineWidth = Math.max(1.5, Math.round(drawH * 0.004))
        const toY = drawH - drawH * 0.18
        ctx.strokeText(`To ${recipientName}`, drawW / 2, toY)
        ctx.fillText(`To ${recipientName}`, drawW / 2, toY)

        // 6. Export
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

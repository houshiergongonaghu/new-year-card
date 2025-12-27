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
    
    // 设置Canvas尺寸 (4:3比例)
    canvas.width = 800
    canvas.height = 600
    
    const img = new Image()
    img.crossOrigin = 'anonymous'
    
    img.onload = () => {
      try {
        // 1. 绘制背景图片
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

        // 2. 绘制标题 (描边文字，写在图片上)
        ctx.font = 'bold 56px "Great Vibes", cursive'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        // 先画白边
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)'
        ctx.lineWidth = 6
        ctx.strokeText('Season\'s Greetings', canvas.width / 2, 70)
        // 再画棕色文字
        ctx.fillStyle = '#8B4513'
        ctx.fillText('Season\'s Greetings', canvas.width / 2, 70)

        // 3. 绘制祝福语 (描边文字，写在背景图上)
        ctx.fillStyle = '#FFFFFF'
        ctx.font = '32px "Caveat", cursive'
        ctx.textAlign = 'center'
        ctx.strokeStyle = '#8B4513'
        ctx.lineWidth = 2

        // 自动换行处理
        const maxWidth = canvas.width - 100
        const lineHeight = 40
        const words = message.split(' ')
        let line = ''
        let y = canvas.height / 2 - 80

        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' '
          const metrics = ctx.measureText(testLine)

          if (metrics.width > maxWidth && n > 0) {
            ctx.strokeText(line, canvas.width / 2, y)
            ctx.fillText(line, canvas.width / 2, y)
            line = words[n] + ' '
            y += lineHeight
          } else {
            line = testLine
          }
        }
        ctx.strokeText(line, canvas.width / 2, y)
        ctx.fillText(line, canvas.width / 2, y)

        // 4. 绘制署名 (描边文字)
        ctx.fillStyle = '#FFFFFF'
        ctx.font = '28px "Caveat", cursive'
        ctx.textAlign = 'right'
        ctx.strokeStyle = '#8B4513'
        ctx.lineWidth = 2
        ctx.strokeText(`— ${senderName}`, canvas.width - 50, canvas.height - 50)
        ctx.fillText(`— ${senderName}`, canvas.width - 50, canvas.height - 50)

        // 5. 绘制收件人 (描边文字)
        ctx.fillStyle = '#FFFFFF'
        ctx.font = '36px "Great Vibes", cursive'
        ctx.textAlign = 'center'
        ctx.strokeStyle = '#8B4513'
        ctx.lineWidth = 2
        ctx.strokeText(`To ${recipientName}`, canvas.width / 2, canvas.height - 120)
        ctx.fillText(`To ${recipientName}`, canvas.width / 2, canvas.height - 120)

        // 6. 导出为DataURL
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


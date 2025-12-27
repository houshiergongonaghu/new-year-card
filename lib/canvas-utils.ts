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
        
        // 2. 创建半透明背景框
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
        ctx.fillRect(40, 40, canvas.width - 80, canvas.height - 80)
        
        // 3. 添加边框装饰
        ctx.strokeStyle = '#8B9B87'
        ctx.lineWidth = 3
        ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80)
        
        // 4. 绘制标题
        ctx.fillStyle = '#4A5946'
        ctx.font = 'bold 48px "Great Vibes", cursive'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('Season\'s Greetings', canvas.width / 2, 80)
        
        // 5. 绘制祝福语
        ctx.fillStyle = '#4A5946'
        ctx.font = '28px "Caveat", cursive'
        ctx.textAlign = 'center'
        
        // 自动换行处理
        const maxWidth = canvas.width - 120
        const lineHeight = 40
        const words = message.split(' ')
        let line = ''
        let y = canvas.height / 2 - 50
        
        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' '
          const metrics = ctx.measureText(testLine)
          
          if (metrics.width > maxWidth && n > 0) {
            ctx.fillText(line, canvas.width / 2, y)
            line = words[n] + ' '
            y += lineHeight
          } else {
            line = testLine
          }
        }
        ctx.fillText(line, canvas.width / 2, y)
        
        // 6. 绘制署名
        ctx.fillStyle = '#8B9B87'
        ctx.font = '24px "Caveat", cursive'
        ctx.textAlign = 'right'
        ctx.fillText(`— ${senderName}`, canvas.width - 60, canvas.height - 60)
        
        // 7. 绘制收件人
        ctx.fillStyle = '#4A5946'
        ctx.font = '32px "Great Vibes", cursive'
        ctx.textAlign = 'center'
        ctx.fillText(`To ${recipientName}`, canvas.width / 2, canvas.height - 120)
        
        // 8. 导出为DataURL
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


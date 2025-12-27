import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { z } from 'zod'

// 初始化 Resend
const resend = new Resend(process.env.RESEND_API_KEY)

// 验证输入数据
const sendEmailSchema = z.object({
  recipientName: z.string().min(1, '收件人姓名不能为空'),
  recipientEmail: z.string().email('邮箱格式不正确'),
  senderName: z.string().min(1, '发送人姓名不能为空'),
  cardUrl: z.string().url('贺卡链接格式不正确'),
})

export async function POST(request: Request) {
  try {
    console.log('\n=== [POST /api/send/email] 开始发送邮件 ===')

    const body = await request.json()
    console.log('[SendEmail] 接收数据:', { ...body, recipientEmail: '***@**.com' }) // 脱敏处理

    // 验证数据
    const validation = sendEmailSchema.safeParse(body)

    if (!validation.success) {
      console.error('[SendEmail] 数据验证失败:', validation.error.errors)
      return NextResponse.json(
        {
          success: false,
          message: '数据验证失败',
          error: validation.error.errors,
        },
        { status: 400 }
      )
    }

    const { recipientName, recipientEmail, senderName, cardUrl } = validation.data

    // 邮件主题
    const subject = `${senderName} 为你制作了一张专属贺卡`

    // 邮件 HTML 内容
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #fdfbf7;
            margin: 0;
            padding: 20px;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          }
          .header {
            background: linear-gradient(135deg, #e8d5d5 0%, #d5c3e8 100%);
            padding: 40px 20px;
            text-align: center;
          }
          .header h1 {
            color: #4a5946;
            font-size: 28px;
            margin: 0 0 10px 0;
            font-family: 'Great Vibes', cursive;
          }
          .card-preview {
            padding: 30px;
            text-align: center;
          }
          .card-image {
            max-width: 100%;
            height: auto;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          }
          .message {
            padding: 30px;
            background: #f9f7f4;
          }
          .message p {
            color: #4a5946;
            font-size: 18px;
            line-height: 1.6;
            margin: 0;
            text-align: center;
          }
          .cta {
            padding: 30px;
            text-align: center;
          }
          .cta-button {
            display: inline-block;
            background: #8b9b87;
            color: white !important;
            padding: 16px 40px;
            text-decoration: none;
            border-radius: 50px;
            font-size: 18px;
            font-weight: 600;
            transition: background 0.3s;
          }
          .cta-button:hover {
            background: #6f7f6b;
          }
          .footer {
            padding: 20px 30px;
            background: #f5f1e8;
            text-align: center;
            color: #8b9b87;
            font-size: 14px;
          }
          .footer p {
            margin: 5px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎄 专属贺卡 🎄</h1>
            <p style="color: #6f7f6b; margin: 0;">一封来自 ${senderName} 的温馨祝福</p>
          </div>

          <div class="card-preview">
            <img src="${cardUrl}" alt="贺卡预览" class="card-image" />
          </div>

          <div class="message">
            <p><strong>亲爱的 ${recipientName}:</strong></p>
            <p>${senderName} 为你精心制作了一张专属贺卡，点击下面的按钮查看完整内容。</p>
          </div>

          <div class="cta">
            <a href="${cardUrl}" class="cta-button">查看我的贺卡 💌</a>
          </div>

          <div class="footer">
            <p>这是一封来自节日贺卡生成器的自动邮件</p>
            <p>© 2025 节日贺卡生成器 | Made with love ✨</p>
          </div>
        </div>
      </body>
      </html>
    `

    console.log('[SendEmail] 准备发送邮件给:', recipientEmail)
    console.log('[SendEmail] 邮件主题:', subject)

    // 发送邮件
    const { data, error } = await resend.emails.send({
      from: '节日贺卡生成器 <onboarding@resend.dev>', // 使用Resend测试域名（方案A）
      to: recipientEmail,
      subject: subject,
      html: html,
    })

    if (error) {
      console.error('[SendEmail] 邮件发送失败:', error)
      return NextResponse.json(
        {
          success: false,
          message: '邮件发送失败',
          error: error.message,
        },
        { status: 500 }
      )
    }

    console.log('[SendEmail] 邮件发送成功, ID:', data.id)

    return NextResponse.json({
      success: true,
      message: '邮件发送成功',
      data: {
        emailId: data.id,
        recipient: recipientEmail,
      },
    })
  } catch (error) {
    console.error('[SendEmail] 服务器错误:', error)
    return NextResponse.json(
      {
        success: false,
        message: '服务器错误',
        error: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
      },
      { status: 500 }
    )
  }
}
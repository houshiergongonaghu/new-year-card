import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// 验证输入数据
const saveCardSchema = z.object({
  senderName: z.string().min(1, '发送人姓名不能为空').max(50, '姓名太长'),
  recipientName: z.string().min(1, '收件人姓名不能为空').max(50, '姓名太长'),
  recipientEmail: z.string().email('邮箱格式不正确'),
  message: z.string().min(1, '祝福语不能为空').max(1000, '祝福语太长'),
  imageUrl: z.string().url('图片URL格式不正确'),
})

export async function POST(request: Request) {
  try {
    console.log('\n=== [POST /api/save/card] 开始保存贺卡数据 ===')

    const body = await request.json()
    console.log('[SaveCard] 接收数据:', JSON.stringify(body))

    // 验证数据
    const validation = saveCardSchema.safeParse(body)

    if (!validation.success) {
      console.error('[SaveCard] 数据验证失败:', validation.error.errors)
      return NextResponse.json(
        {
          success: false,
          message: '数据验证失败',
          error: validation.error.errors,
        },
        { status: 400 }
      )
    }

    const { senderName, recipientName, recipientEmail, message, imageUrl } = validation.data

    console.log('[SaveCard] 准备写入数据库...')

    // 写入数据库
    const { data, error } = await supabase
      .from('cards')
      .insert([
        {
          sender_name: senderName,
          recipient_name: recipientName,
          message: message,
          image_url: imageUrl,
          // recipient_email 不在 cards 表中,后续需要扩展 schema
        },
      ])
      .select()
      .single()

    if (error) {
      console.error('[SaveCard] 数据库写入失败:', error)
      return NextResponse.json(
        {
          success: false,
          message: '保存到数据库失败',
          error: error.message,
        },
        { status: 500 }
      )
    }

    console.log('[SaveCard] 写入成功, ID:', data.id)

    return NextResponse.json({
      success: true,
      message: '贺卡数据保存成功',
      data: {
        cardId: data.id,
        senderName: data.sender_name,
        recipientName: data.recipient_name,
        message: data.message,
        imageUrl: data.image_url,
        createdAt: data.created_at,
      },
    })
  } catch (error) {
    console.error('[SaveCard] 服务器错误:', error)
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

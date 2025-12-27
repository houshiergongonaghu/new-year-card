import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: Request) {
  try {
    console.log('\n=== [POST /api/upload] 开始上传图片到Supabase ===')
    
    const body = await request.json()
    const { image } = body
    
    if (!image) {
      console.log('[上传错误] 缺少图片数据')
      return NextResponse.json(
        {
          success: false,
          message: '缺少图片数据',
          error: 'MISSING_IMAGE_DATA'
        },
        { status: 400 }
      )
    }
    
    // 从dataURL提取base64数据
    const base64Data = image.split(',')[1]
    if (!base64Data) {
      console.log('[上传错误] 图片格式无效')
      return NextResponse.json(
        {
          success: false,
          message: '图片格式无效',
          error: 'INVALID_IMAGE_FORMAT'
        },
        { status: 400 }
      )
    }
    
    // 转换为Buffer
    const buffer = Buffer.from(base64Data, 'base64')
    
    // 生成唯一文件名
    const filename = `card-${Date.now()}-${Math.random().toString(36).substring(2, 11)}.jpg`
    
    console.log(`[上传] 文件名: ${filename}, 大小: ${buffer.length} bytes`)
    
    // 上传到Supabase Storage
    const { data, error } = await supabase
      .storage
      .from('cards')
      .upload(filename, buffer, {
        contentType: 'image/jpeg',
        upsert: false
      })
    
    if (error) {
      console.error('[Supabase上传错误]', error)
      return NextResponse.json(
        {
          success: false,
          message: '上传失败',
          error: error.message
        },
        { status: 500 }
      )
    }
    
    // 获取公开URL
    const { data: publicUrlData } = supabase
      .storage
      .from('cards')
      .getPublicUrl(filename)
    
    const publicUrl = publicUrlData.publicUrl
    
    console.log('[上传成功] 永久链接:', publicUrl)
    
    return NextResponse.json({
      success: true,
      message: '图片上传成功',
      data: {
        imageUrl: publicUrl,
        filename: filename
      }
    })
    
  } catch (error) {
    console.error('[服务器错误]', error)
    return NextResponse.json(
      {
        success: false,
        message: '服务器错误',
        error: error instanceof Error ? error.message : 'UNKNOWN_ERROR'
      },
      { status: 500 }
    )
  }
}

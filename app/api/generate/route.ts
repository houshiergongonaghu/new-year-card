import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const MAX_GENERATIONS = 5
const WINDOW_MS = 24 * 60 * 60 * 1000

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function getClientIP(request: Request): string {
  const headers = Object.fromEntries(request.headers.entries())

  const xForwardedFor = headers['x-forwarded-for']
  const xRealIp = headers['x-real-ip']

  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim()
  }

  if (xRealIp) {
    return xRealIp
  }

  return '127.0.0.1'
}

async function getRecentCount(ip: string): Promise<number> {
  const since = new Date(Date.now() - WINDOW_MS).toISOString()
  const { data, error } = await supabase
    .from('generation_logs')
    .select('*')
    .eq('ip', ip)
    .gte('created_at', since)

  if (error) {
    console.error('[限流错误]', error.message)
    return MAX_GENERATIONS
  }

  return data?.length || 0
}

export async function POST(request: Request) {
  try {
    console.log('\n=== [POST /api/generate] 请求开始 ===')

    const ip = getClientIP(request)
    console.log(`[IP] ${ip}`)

    const count = await getRecentCount(ip)
    console.log(`[限流结果] 24小时内已生成 ${count}/${MAX_GENERATIONS} 次`)

    if (count >= MAX_GENERATIONS) {
      console.log(`[限流] IP ${ip} 已达到24小时限制`)
      return NextResponse.json(
        {
          success: false,
          message: `每个IP每24小时最多生成${MAX_GENERATIONS}张图片`,
          error: 'RATE_LIMIT_EXCEEDED',
        },
        { status: 429 }
      )
    }

    const formData = await request.formData()
    const imageFile = formData.get('image') as File

    if (!imageFile) {
      console.log('[参数错误] 缺少图片文件')
      return NextResponse.json(
        {
          success: false,
          message: '请上传图片',
          error: 'MISSING_IMAGE',
        },
        { status: 400 }
      )
    }

    console.log(`[图片信息] ${imageFile.name}, ${imageFile.size} bytes, ${imageFile.type}`)

    const mockEnabled =
      process.env.MOCK_AI === '1' || process.env.MOCK_AI === 'true'
    if (mockEnabled) {
      console.log('[Mock AI] 已启用，跳过 Replicate')

      console.log('[日志] 记录生成记录...')
      const { error: logError } = await supabase
        .from('generation_logs')
        .insert([{ ip }])

      if (logError) {
        console.error('[日志错误]', logError)
      } else {
        console.log('[日志] 记录成功')
      }

      const remainingCount = await getRecentCount(ip)
      const remainingGenerations = Math.max(0, MAX_GENERATIONS - remainingCount)
      const mockImageUrl = new URL(
        '/watercolor-bunny-in-winter-scene.jpg',
        request.url
      ).toString()

      return NextResponse.json({
        success: true,
        message: 'Mock 图片生成成功',
        data: {
          imageUrl: mockImageUrl,
          remainingGenerations,
        },
      })
    }

    const imageBuffer = Buffer.from(await imageFile.arrayBuffer())
    const mimeType = imageFile.type || 'image/jpeg'
    const extFromMime: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    }
    const nameExt = imageFile.name?.split('.').pop()?.toLowerCase()
    const fileExt = extFromMime[mimeType] || (nameExt === 'jpeg' ? 'jpg' : nameExt) || 'jpg'
    const inputFilename = `inputs/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${fileExt}`

    console.log('[上传原图] 开始上传到 Supabase:', inputFilename)
    const { error: inputUploadError } = await supabase
      .storage
      .from('cards')
      .upload(inputFilename, imageBuffer, {
        contentType: mimeType,
        upsert: false,
      })

    if (inputUploadError) {
      console.error('[上传原图] 失败:', inputUploadError)
      return NextResponse.json(
        {
          success: false,
          message: '原图上传失败',
          error: inputUploadError.message,
        },
        { status: 500 }
      )
    }

    const { data: inputUrlData } = supabase
      .storage
      .from('cards')
      .getPublicUrl(inputFilename)
    const inputImageUrl = inputUrlData.publicUrl

    if (!inputImageUrl) {
      console.error('[上传原图] 未获取到公开 URL')
      return NextResponse.json(
        {
          success: false,
          message: '原图链接获取失败',
          error: 'MISSING_INPUT_URL',
        },
        { status: 500 }
      )
    }

    const replicateToken = process.env.REPLICATE_API_TOKEN
    if (!replicateToken) {
      console.error('[配置错误] 缺少 REPLICATE_API_TOKEN')
      return NextResponse.json(
        {
          success: false,
          message: '服务器配置错误',
          error: 'MISSING_API_TOKEN',
        },
        { status: 500 }
      )
    }

    console.log('[Replicate] 开始调用 AI 生成...')

    const response = await fetch(
      'https://api.replicate.com/v1/models/black-forest-labs/flux-kontext-pro/predictions',
      {
        method: 'POST',
        headers: {
          Authorization: `Token ${replicateToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: {
            prompt: 'cute warm Chinese New Year illustration, cozy atmosphere, soft colors, adorable characters, festive decorations',
            input_image: inputImageUrl,
            aspect_ratio: 'match_input_image',
            output_format: 'jpg',
            safety_tolerance: 2,
            prompt_upsampling: false,
          },
        }),
      }
    )

    const createBodyText = await response.text()
    let prediction: any = null
    try {
      prediction = JSON.parse(createBodyText)
    } catch (parseError) {
      console.error('[Replicate Error] 创建响应不是 JSON:', createBodyText)
      return NextResponse.json(
        {
          success: false,
          message: 'Replicate 响应格式异常',
          error: 'REPLICATE_INVALID_RESPONSE',
          details: createBodyText.slice(0, 500),
        },
        { status: 502 }
      )
    }

    console.log('[Replicate] 创建响应状态', response.status)
    console.log('[Replicate] 预测创建:', prediction?.id)

    if (!response.ok || prediction?.error) {
      console.error('[Replicate Error]', prediction?.error || prediction)
      return NextResponse.json(
        {
          success: false,
          message: 'Replicate 创建预测失败',
          error: prediction?.error || 'REPLICATE_CREATE_FAILED',
          details: prediction,
        },
        { status: response.status || 502 }
      )
    }

    let result = prediction
    for (let i = 0; i < 60; i++) {
      await new Promise((resolve) => setTimeout(resolve, 2000))

      const statusResponse = await fetch(
        `https://api.replicate.com/v1/predictions/${prediction.id}`,
        {
          headers: { Authorization: `Token ${replicateToken}` },
        }
      )

      result = await statusResponse.json()
      console.log(`[等待结果] ${i * 2}秒, 状态: ${result.status}`)

      if (result.status === 'succeeded') {
        console.log('[Replicate] 生成成功!')
        break
      } else if (result.status === 'failed') {
        throw new Error(`生成失败: ${result.error}`)
      }
    }

    if (result.status !== 'succeeded') {
      throw new Error('生成超时')
    }

    const output = result.output
    const generatedImageUrl = Array.isArray(output) ? output[0] : output

    if (!generatedImageUrl) {
      throw new Error('生成结果为空')
    }
    console.log('[Replicate] 图片URL:', generatedImageUrl)

    console.log('[日志] 记录生成记录...')
    const { error: logError } = await supabase
      .from('generation_logs')
      .insert([{ ip }])

    if (logError) {
      console.error('[日志错误]', logError)
    } else {
      console.log('[日志] 记录成功')
    }

    const remainingCount = await getRecentCount(ip)
    const remainingGenerations = Math.max(0, MAX_GENERATIONS - remainingCount)

    return NextResponse.json({
      success: true,
      message: '图片生成成功',
      data: {
        imageUrl: generatedImageUrl,
        remainingGenerations,
      },
    })
  } catch (error) {
    console.error('[服务器错误]', error)
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

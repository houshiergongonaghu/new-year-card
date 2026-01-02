import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

async function checkRateLimit(ip: string): Promise<boolean> {
  console.log(`[闄愭祦妫€鏌 IP: ${ip}`)
  
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  
  const { data, error } = await supabase
    .from('generation_logs')
    .select('*')
    .eq('ip', ip)
    .gte('created_at', twentyFourHoursAgo)
  
  if (error) {
    console.error(`[闄愭祦閿欒] ${error.message}`)
    return true
  }
  
  const count = data?.length || 0
  console.log(`[闄愭祦缁撴灉] 24灏忔椂鍐呭凡鐢熸垚 ${count}/5 娆)
  
  return count < 5
}

export async function POST(request: Request) {
  try {
    console.log('\n=== [POST /api/generate] 璇锋眰寮€濮?===')
    
    const ip = getClientIP(request)
    console.log(`[IP] ${ip}`)
    
    const allowed = await checkRateLimit(ip)
    if (!allowed) {
      console.log(`[闄愭祦] IP ${ip} 宸茶揪鍒?4灏忔椂闄愬埗`)
      return NextResponse.json(
        {
          success: false,
          message: '姣忎釜IP姣?4灏忔椂鏈€澶氱敓鎴?寮犲浘鐗?,
          error: 'RATE_LIMIT_EXCEEDED'
        },
        { status: 429 }
      )
    }
    
    const formData = await request.formData()
    const imageFile = formData.get('image') as File
    
    if (!imageFile) {
      console.log('[鍙傛暟閿欒] 缂哄皯鍥剧墖鏂囦欢')
      return NextResponse.json(
        {
          success: false,
          message: '璇蜂笂浼犲浘鐗?,
          error: 'MISSING_IMAGE'
        },
        { status: 400 }
      )
    }
    
    console.log(`[鍥剧墖淇℃伅] ${imageFile.name}, ${imageFile.size} bytes, ${imageFile.type}`)

    const mockEnabled =
      process.env.MOCK_AI === '1' || process.env.MOCK_AI === 'true'
    if (mockEnabled) {
      console.log('[Mock AI] 宸插惎鐢紝璺宠繃 Replicate')

      console.log('[鏃ュ織] 璁板綍鐢熸垚璁板綍...')
      const { error: logError } = await supabase
        .from('generation_logs')
        .insert([{ ip }])

      if (logError) {
        console.error('[鏃ュ織閿欒]', logError)
      } else {
        console.log('[鏃ュ織] 璁板綍鎴愬姛')
      }

      const { data: remainingData } = await supabase
        .from('generation_logs')
        .select('*')
        .eq('ip', ip)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

      const remainingGenerations = 5 - (remainingData?.length || 0)
      const mockImageUrl = new URL(
        '/watercolor-bunny-in-winter-scene.jpg',
        request.url
      ).toString()

      return NextResponse.json({
        success: true,
        message: 'Mock 鍥剧墖鐢熸垚鎴愬姛',
        data: {
          imageUrl: mockImageUrl,
          remainingGenerations,
        }
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

    console.log('[涓婁紶鍘熷浘] 寮€濮嬩笂浼犲埌 Supabase:', inputFilename)
    const { error: inputUploadError } = await supabase
      .storage
      .from('cards')
      .upload(inputFilename, imageBuffer, {
        contentType: mimeType,
        upsert: false,
      })

    if (inputUploadError) {
      console.error('[涓婁紶鍘熷浘] 澶辫触:', inputUploadError)
      return NextResponse.json(
        {
          success: false,
          message: '鍘熷浘涓婁紶澶辫触',
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
      console.error('[涓婁紶鍘熷浘] 鏈幏鍙栧埌鍏紑 URL')
      return NextResponse.json(
        {
          success: false,
          message: '鍘熷浘閾炬帴鑾峰彇澶辫触',
          error: 'MISSING_INPUT_URL',
        },
        { status: 500 }
      )
    }
    
    const replicateToken = process.env.REPLICATE_API_TOKEN
    if (!replicateToken) {
      console.error('[閰嶇疆閿欒] 缂哄皯 REPLICATE_API_TOKEN')
      return NextResponse.json(
        {
          success: false,
          message: '鏈嶅姟鍣ㄩ厤缃敊璇?,
          error: 'MISSING_API_TOKEN'
        },
        { status: 500 }
      )
    }
    
    console.log('[Replicate] 寮€濮嬭皟鐢ˋI鐢熸垚...')
    
    const response = await fetch(
      'https://api.replicate.com/v1/models/black-forest-labs/flux-kontext-pro/predictions',
      {
      method: 'POST',
      headers: {
        'Authorization': `Token ${replicateToken}`,
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
        }
      })
    }
    )
    
    const createBodyText = await response.text()
    let prediction: any = null
    try {
      prediction = JSON.parse(createBodyText)
    } catch (parseError) {
      console.error('[Replicate Error] 鍒涘缓鍝嶅簲涓嶆槸JSON:', createBodyText)
      return NextResponse.json(
        {
          success: false,
          message: 'Replicate鍝嶅簲鏍煎紡寮傚父',
          error: 'REPLICATE_INVALID_RESPONSE',
          details: createBodyText.slice(0, 500),
        },
        { status: 502 }
      )
    }

    console.log('[Replicate] 鍒涘缓鍝嶅簲鐘舵€?', response.status)
    console.log('[Replicate] 棰勬祴鍒涘缓:', prediction?.id)
    
    if (!response.ok || prediction?.error) {
      console.error('[Replicate Error]', prediction?.error || prediction)
      return NextResponse.json(
        {
          success: false,
          message: 'Replicate鍒涘缓棰勬祴澶辫触',
          error: prediction?.error || 'REPLICATE_CREATE_FAILED',
          details: prediction,
        },
        { status: response.status || 502 }
      )
    }
    
    let result = prediction
    for (let i = 0; i < 60; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const statusResponse = await fetch(
        `https://api.replicate.com/v1/predictions/${prediction.id}`,
        {
          headers: { 'Authorization': `Token ${replicateToken}` }
        }
      )
      
      result = await statusResponse.json()
      console.log(`[绛夊緟缁撴灉] ${i * 2}绉? 鐘舵€? ${result.status}`)
      
      if (result.status === 'succeeded') {
        console.log('[Replicate] 鐢熸垚鎴愬姛!')
        break
      } else if (result.status === 'failed') {
        throw new Error(`鐢熸垚澶辫触: ${result.error}`)
      }
    }
    
    if (result.status !== 'succeeded') {
      throw new Error('鐢熸垚瓒呮椂')
    }
    
    const output = result.output
    const generatedImageUrl = Array.isArray(output) ? output[0] : output

    if (!generatedImageUrl) {
      throw new Error('鐢熸垚缁撴灉涓虹┖')
    }
    console.log('[Replicate] 鍥剧墖URL:', generatedImageUrl)
    
    console.log('[鏃ュ織] 璁板綍鐢熸垚璁板綍...')
    const { error: logError } = await supabase
      .from('generation_logs')
      .insert([{ ip }])
    
    if (logError) {
      console.error('[鏃ュ織閿欒]', logError)
    } else {
      console.log('[鏃ュ織] 璁板綍鎴愬姛')
    }
    
    return NextResponse.json({
      success: true,
      message: '鍥剧墖鐢熸垚鎴愬姛',
      data: {
        imageUrl: generatedImageUrl,
        remainingGenerations: 5 - ((await supabase.from('generation_logs').select('*').eq('ip', ip).gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())).data?.length || 0)
      }
    })
    
  } catch (error) {
    console.error('[鏈嶅姟鍣ㄩ敊璇痌', error)
    return NextResponse.json(
      {
        success: false,
        message: '鏈嶅姟鍣ㄩ敊璇?,
        error: error instanceof Error ? error.message : 'UNKNOWN_ERROR'
      },
      { status: 500 }
    )
  }
}



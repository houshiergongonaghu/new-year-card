import { createClient } from '@supabase/supabase-js'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'

// Types
interface Card {
  id: string
  image_url: string
  sender_name: string
  recipient_name: string
  message: string
  created_at: string
}

async function getCard(cardId: string): Promise<Card | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('id', cardId)
    .single()

  if (error) {
    console.error('Error fetching card:', error)
    return null
  }

  return data
}

export default async function CardViewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const card = await getCard(id)

  if (!card) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-serif text-4xl font-bold text-[#8B9B87] mb-4">贺卡不存在</h1>
          <p className="text-[#6B8E5A] mb-8">抱歉，您要查看的贺卡已失效或不存在。</p>
          <Link href="/">
            <Button className="rounded-full bg-[#8B9B87] hover:bg-[#6F7F6B] text-white font-medium">
              <Sparkles className="mr-2 h-4 w-4" />
              我也要做一张
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] py-8 px-4 sm:py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Card Display */}
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl font-bold text-[#8B9B87] mb-2">
            Season's Greetings, {card.recipient_name}!
          </h1>
          <p className="text-[#6B8E5A] font-medium">
            一封来自 {card.sender_name} 的温馨祝福
          </p>
        </div>

        {/* Card Image */}
        <div className="mb-8">
          <div className="relative mx-auto max-w-2xl">
            <Image
              src={card.image_url}
              alt={`${card.sender_name} 给 ${card.recipient_name} 的贺卡`}
              width={800}
              height={600}
              className="w-full h-auto rounded-2xl shadow-2xl"
              priority
            />
          </div>
        </div>

        {/* Message */}
        {card.message && (
          <div className="bg-white rounded-2xl border-2 border-[#E5DCC8] p-8 mb-8 mx-auto max-w-2xl">
            <h2 className="font-serif text-xl font-semibold text-[#8B9B87] mb-4">专属祝福语</h2>
            <p className="font-serif text-lg text-[#4A5946] leading-relaxed whitespace-pre-wrap">
              {card.message}
            </p>
          </div>
        )}

        {/* CTA Section */}
        <div className="text-center bg-white rounded-2xl border-2 border-[#E5DCC8] p-8">
          <h2 className="font-serif text-2xl font-bold text-[#8B9B87] mb-4">
            感动了吗？
          </h2>
          <p className="text-[#6B8E5A] mb-6">
            为你的朋友也制作一张专属贺卡吧！
          </p>
          <Link href="/">
            <Button className="rounded-full bg-gradient-to-r from-[#8B9B87] to-[#6B8E5A] hover:from-[#6B8E5A] hover:to-[#5A7A4A] text-white font-semibold text-lg py-6 px-8">
              <Sparkles className="mr-2 h-5 w-5" />
              我也要做一张
            </Button>
          </Link>
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center">
          <p className="font-serif text-sm text-[#8B9B87] italic">Made with love ✨</p>
          <p className="text-xs text-[#8B9B87]/60 mt-2">贺卡生成于 {new Date(card.created_at).toLocaleString('zh-CN')}</p>
        </footer>
      </div>
    </div>
  )
}

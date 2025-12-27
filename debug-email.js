#!/usr/bin/env node

// 诊断邮件发送问题的脚本
const readline = require('readline')

console.log('=== 邮件发送问题诊断工具 ===\n')

// 1. 检查环境变量
console.log('1. 检查环境变量:')
console.log('   RESEND_API_KEY:', process.env.RESEND_API_KEY ? '✅ 已设置' : '❌ 未设置')
console.log('   NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ 已设置' : '❌ 未设置')

// 2. 测试邮件API
async function testEmailAPI() {
  console.log('\n2. 测试邮件发送API:')

  try {
    const response = await fetch('http://localhost:3000/api/send/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipientName: '测试收件人',
        recipientEmail: 'test@example.com',
        senderName: '测试发送者',
        cardUrl: 'http://example.com/card/test'
      })
    })

    const data = await response.json()
    console.log('   HTTP状态:', response.status)
    console.log('   响应数据:', JSON.stringify(data, null, 2))

    if (data.success) {
      console.log('   ✅ API调用成功')
    } else {
      console.log('   ❌ API调用失败:', data.message)
    }
  } catch (error) {
    console.log('   ❌ API调用失败:', error.message)
  }
}

// 3. 检查最近保存的贺卡
async function checkRecentCards() {
  console.log('\n3. 检查最近保存的贺卡:')

  try {
    const { createClient } = require('@supabase/supabase-js')

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    if (error) {
      console.log('   ❌ 查询失败:', error.message)
    } else {
      console.log('   ✅ 找到', data.length, '条记录')
      data.forEach(card => {
        console.log(`   - Card ID: ${card.id}`)
        console.log(`     Image: ${card.image_url}`)
        console.log(`     Created: ${card.created_at}`)
      })
    }
  } catch (error) {
    console.log('   ❌ 查询失败:', error.message)
  }
}

// 4. 显示诊断信息
function showDebugInfo() {
  console.log('\n4. 调试信息:')
  console.log('   - 检查开发服务器日志中是否有 [SendCard] 前缀的日志')
  console.log('   - 检查是否有 [SendEmail] 相关的错误信息')
  console.log('   - 确认收件人邮箱地址是否正确')
  console.log('   - 检查垃圾邮件文件夹')
}

async function runDiagnostics() {
  // 等待用户输入继续
  await askQuestion('\n按回车键开始诊断...')

  await testEmailAPI()
  await checkRecentCards()
  showDebugInfo()

  console.log('\n=== 诊断完成 ===')
  process.exit(0)
}

// 简单的输入等待
async function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  return new Promise(resolve => {
    rl.question(query, (answer) => {
      rl.close()
      resolve(answer)
    })
  })
}

// 运行诊断
if (require.main === module) {
  runDiagnostics().catch(console.error)
}

module.exports = { runDiagnostics }

# Phase 6 完成验证指南

## 📋 阶段6任务清单

### ✅ 已完成项

1. **创建存储元数据 API**
   - 文件：`app/api/save/card/route.ts`
   - 功能：接收贺卡数据并保存到 Supabase `cards` 表
   - 测试方法：POST `http://localhost:3000/api/save/card`

2. **写入 cards 表**
   - 表结构：id, image_url, sender_name, recipient_name, message, created_at
   - 验证SQL：SELECT * FROM cards ORDER BY created_at DESC;

3. **集成 Resend API**
   - 已安装：`npm install resend`
   - 文件：`app/api/send/email/route.ts`
   - 配置：需要 `.env.local` 中的 `RESEND_API_KEY`

4. **实现邮件模板**
   - HTML模板已创建
   - 包含：贺卡预览图、祝福语、CTA按钮

## 🔍 如何验证阶段6

### 方法1: 完整流程测试（推荐）

1. **启动开发服务器**
   ```bash
   npm run dev
   ```

2. **准备测试数据**
   - 准备一张测试图片（JPG/PNG）
   - 填写表单：
     - 您的姓名：测试发送者
     - 您的邮箱：your-email@example.com
     - 收件人姓名：测试收件人
     - 收件人邮箱：recipient@example.com
     - 消息：这是一条测试消息

3. **执行完整流程**：
   - 上传图片 → 点击"AI生成水彩风格"
   - 点击"生成贺卡" → 等待Supabase上传完成
   - 点击"Send with Love" → 触发保存+邮件发送
   - 预期看到：
     * 控制台日志：[CreateCard] 上传成功: xxx
     * 弹窗提示："保存贺卡数据到数据库成功"
     * 弹窗提示："邮件发送成功! 🎉"

4. **验证结果**：
   - 检查邮箱是否收到邮件
   - 查看 Supabase Dashboard → SQL Editor
   - 执行：SELECT * FROM cards ORDER BY created_at DESC;

### 方法2: API单独测试

#### 测试保存 API
```bash
curl -X POST http://localhost:3000/api/save/card \
  -H "Content-Type: application/json" \
  -d '{
    "senderName": "测试发送者",
    "recipientName": "测试收件人",
    "recipientEmail": "test@example.com",
    "message": "这是一条测试消息",
    "imageUrl": "https://example.com/test.jpg"
  }'
```

#### 测试邮件 API
```bash
curl -X POST http://localhost:3000/api/send/email \
  -H "Content-Type: application/json" \
  -d '{
    "recipientName": "测试收件人",
    "recipientEmail": "your-email@example.com",
    "senderName": "测试发送者",
    "cardUrl": "http://localhost:3000/card/test-123"
  }'
```

### 方法3: 查看代码实现 (verification checklist)

#### 文件存在检查
- [x] `app/api/save/card/route.ts` - 保存贺卡数据API
- [x] `app/api/send/email/route.ts` - 发送邮件API
- [x] `app/page.tsx` - 包含 handleSubmit 函数
- [x] `package.json` - 包含 "resend": "^6.6.0"

#### 关键代码验证

**保存API (`app/api/save/card/route.ts`):**
```typescript
// 验证包含以下逻辑:
1. Zod schema 验证
2. supabase.from('cards').insert()
3. select() 获取返回数据
4. 返回 { success: true, data: { cardId: data.id, ... } }
```

**邮件API (`app/api/send/email/route.ts`):**
```typescript
// 验证包含以下逻辑:
1. Resend 初始化: new Resend(process.env.RESEND_API_KEY)
2. HTML 模板包含: 贺卡预览、祝福语、CTA按钮
3. resend.emails.send() 调用
4. 错误处理
```

**前端集成 (`app/page.tsx`):**
```typescript
// 验证 handleSubmit 函数:
1. 调用 fetch('/api/save/card')
2. 提取 cardId
3. 构造 cardUrl
4. 调用 fetch('/api/send/email')
5. 显示成功提示
```

## ⚠️  注意事项

1. **环境变量配置**
   确保 `.env.local` 包含：
   ```env
   RESEND_API_KEY=your_api_key_here
   ```

2. **Supabase 配置**
   - 确认 `cards` 表已创建
   - 确认 Storage bucket "cards" 已创建并启用 public 读取权限

3. **域名验证 (Resend)**
   - Resend 需要验证发送域名
   - 测试时可使用 Resend 提供的测试域名

4. **记录重要信息**
   - 贺卡ID (data.cardId)
   - 邮件ID (data.emailId)
   - 用于后续调试

## ✅ 阶段6完成标准

当满足以下所有条件时，Phase 6 视为完成：

1. ✓ `npm run dev` 无编译错误
2. ✓ 控制台显示 [SaveCard] 写入成功
3. ✓ Supabase cards 表中有新记录
4. ✓ 测试邮箱收到邮件通知
5. ✓ 邮件中包含正确的贺卡预览图
6. ✓ 邮件中的链接格式为: `{origin}/card/{cardId}`
7. ✓ 邮件模板符合设计规范（粉紫渐变、手写体标题）

## 📝 验证完成后

如果所有验证通过，请：

1. 在 `任务清单.md` 中标记 Phase 6 完成
2. 继续 Phase 7 实现
3. 记录任何遇到的问题和解决方案

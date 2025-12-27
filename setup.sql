-- 创建IP限流表
create table if not exists generation_logs (
  id uuid primary key default gen_random_uuid(),
  ip text not null,
  created_at timestamptz default now()
);

-- 创建索引加速查询
create index if not exists generation_logs_ip_time_idx
  on generation_logs (ip, created_at desc);

-- 查看表结构
comment on table generation_logs is '记录AI图像生成的IP限流日志';

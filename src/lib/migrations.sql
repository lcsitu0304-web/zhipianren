-- 创建 messages 表
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  role_id VARCHAR(50) NOT NULL,
  role VARCHAR(10) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_messages_role_id ON messages(role_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
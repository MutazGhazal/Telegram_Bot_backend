CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE user_bots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    bot_token TEXT NOT NULL,
    bot_name VARCHAR(255) NOT NULL,
    bot_username VARCHAR(255),
    ai_provider VARCHAR(50) DEFAULT 'google_gemini',
    ai_model VARCHAR(100) DEFAULT 'gemini-2.0-flash-exp',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE bot_prompts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bot_id UUID REFERENCES user_bots(id) ON DELETE CASCADE,
    prompt_text TEXT NOT NULL,
    file_name VARCHAR(255),
    file_type VARCHAR(50),
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE bot_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bot_id UUID REFERENCES user_bots(id) ON DELETE CASCADE,
    welcome_message TEXT,
    max_tokens INTEGER DEFAULT 2048,
    temperature DECIMAL(3,2) DEFAULT 0.70,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(bot_id)
);

CREATE TABLE custom_commands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bot_id UUID REFERENCES user_bots(id) ON DELETE CASCADE,
    command_name VARCHAR(100) NOT NULL,
    command_response TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bot_id UUID REFERENCES user_bots(id) ON DELETE CASCADE,
    telegram_user_id BIGINT NOT NULL,
    telegram_username VARCHAR(255),
    started_at TIMESTAMP DEFAULT NOW(),
    ended_at TIMESTAMP,
    messages_count INTEGER DEFAULT 0
);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    message_type VARCHAR(10) NOT NULL,
    content TEXT NOT NULL,
    ai_tokens_used INTEGER DEFAULT 0,
    response_time_ms INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bot_id UUID REFERENCES user_bots(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_messages INTEGER DEFAULT 0,
    unique_users INTEGER DEFAULT 0,
    total_tokens_used INTEGER DEFAULT 0,
    UNIQUE(bot_id, date)
);

CREATE INDEX idx_user_bots_user ON user_bots(user_id);
CREATE INDEX idx_conversations_bot ON conversations(bot_id);
CREATE INDEX idx_messages_conv ON messages(conversation_id);

ALTER TABLE user_bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own bots" ON user_bots USING (auth.uid() = user_id);
CREATE POLICY "Users insert own bots"
ON user_bots FOR INSERT
WITH CHECK (auth.uid() = user_id);

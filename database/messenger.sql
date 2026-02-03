CREATE TABLE messenger_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bot_id UUID REFERENCES user_bots(id) ON DELETE CASCADE,
    page_id VARCHAR(120),
    page_access_token TEXT,
    webhook_url TEXT,
    status VARCHAR(30) DEFAULT 'disconnected',
    last_connected_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(bot_id)
);

CREATE INDEX idx_messenger_sessions_bot ON messenger_sessions(bot_id);

ALTER TABLE messenger_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own messenger sessions"
ON messenger_sessions USING (
  auth.uid() = (SELECT user_id FROM user_bots WHERE user_bots.id = messenger_sessions.bot_id)
);

CREATE POLICY "Users insert own messenger sessions"
ON messenger_sessions FOR INSERT
WITH CHECK (
  auth.uid() = (SELECT user_id FROM user_bots WHERE user_bots.id = messenger_sessions.bot_id)
);

CREATE TABLE instagram_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bot_id UUID REFERENCES user_bots(id) ON DELETE CASCADE,
    account_id VARCHAR(120),
    access_token TEXT,
    webhook_url TEXT,
    status VARCHAR(30) DEFAULT 'disconnected',
    last_connected_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(bot_id)
);

CREATE INDEX idx_instagram_sessions_bot ON instagram_sessions(bot_id);

ALTER TABLE instagram_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own instagram sessions"
ON instagram_sessions USING (
  auth.uid() = (SELECT user_id FROM user_bots WHERE user_bots.id = instagram_sessions.bot_id)
);

CREATE POLICY "Users insert own instagram sessions"
ON instagram_sessions FOR INSERT
WITH CHECK (
  auth.uid() = (SELECT user_id FROM user_bots WHERE user_bots.id = instagram_sessions.bot_id)
);

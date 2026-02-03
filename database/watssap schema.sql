CREATE TABLE whatsapp_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bot_id UUID REFERENCES user_bots(id) ON DELETE CASCADE,
    phone VARCHAR(32),
    session_name VARCHAR(120),
    webhook_url TEXT,
    status VARCHAR(30) DEFAULT 'disconnected',
    last_qr TEXT,
    last_qr_at TIMESTAMP,
    connected_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(bot_id)
);

CREATE INDEX idx_whatsapp_sessions_bot ON whatsapp_sessions(bot_id);

ALTER TABLE whatsapp_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own whatsapp sessions"
ON whatsapp_sessions USING (
  auth.uid() = (SELECT user_id FROM user_bots WHERE user_bots.id = whatsapp_sessions.bot_id)
);

CREATE POLICY "Users insert own whatsapp sessions"
ON whatsapp_sessions FOR INSERT
WITH CHECK (
  auth.uid() = (SELECT user_id FROM user_bots WHERE user_bots.id = whatsapp_sessions.bot_id)
);

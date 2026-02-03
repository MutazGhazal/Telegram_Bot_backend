import path from 'path';
import fs from 'fs/promises';
import QRCode from 'qrcode';
import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState
} from '@whiskeysockets/baileys';
import { ai } from './ai-handler.js';
import { db } from '../database.js';

const MAX_HISTORY = 20;

class WhatsappManager {
  constructor() {
    this.sessions = new Map();
  }

  normalizeSession(botId, data = {}) {
    return {
      botId: String(botId),
      status: data.status || 'disconnected',
      sessionName: data.sessionName || `bot-${botId}`,
      phone: data.phone || null,
      webhookUrl: data.webhookUrl || null,
      lastQr: data.lastQr || null,
      lastQrAt: data.lastQrAt || null,
      connectedAt: data.connectedAt || null,
      updatedAt: data.updatedAt || new Date().toISOString(),
      error: data.error || null,
      client: data.client || null,
      history: data.history || [],
      retryCount: data.retryCount || 0,
      manualDisconnect: data.manualDisconnect || false
    };
  }

  toPublic(session) {
    if (!session) return null;
    const { client, history, lastQr, ...publicSession } = session;
    return {
      ...publicSession,
      lastQr,
      qrCode: lastQr
    };
  }

  getStatus(botId) {
    const session = this.sessions.get(String(botId));
    return this.toPublic(session || this.normalizeSession(botId));
  }

  updateSession(botId, data = {}) {
    const key = String(botId);
    const current = this.sessions.get(key);
    const next = this.normalizeSession(botId, {
      ...(current || {}),
      ...data,
      updatedAt: new Date().toISOString()
    });
    this.sessions.set(key, next);
    return next;
  }

  async connect(botId) {
    const key = String(botId);
    const existing = this.sessions.get(key);

    if (existing?.status === 'connected' || existing?.status === 'connecting') {
      return this.toPublic(existing);
    }

    if (existing?.client) {
      try {
        await existing.client.logout();
        existing.client.end?.();
      } catch {
        // ignore cleanup errors
      }
    }

    const userDataDir = path.resolve('tokens', `baileys-bot-${botId}`);
    await fs.mkdir(userDataDir, { recursive: true });

    const session = this.updateSession(botId, {
      sessionName: existing?.sessionName || `bot-${botId}`,
      phone: existing?.phone || null,
      webhookUrl: existing?.webhookUrl || null,
      status: 'connecting',
      error: null,
      manualDisconnect: false
    });

    try {
      const { state, saveCreds } = await useMultiFileAuthState(userDataDir);
      const { version } = await fetchLatestBaileysVersion();

      const sock = makeWASocket({
        auth: state,
        version,
        printQRInTerminal: false,
        syncFullHistory: false
      });

      sock.ev.on('creds.update', saveCreds);

      sock.ev.on('connection.update', async (update) => {
        if (update.connection === 'connecting') {
          this.updateSession(botId, { status: 'connecting' });
        }

        if (update.qr) {
          const qrDataUrl = await QRCode.toDataURL(update.qr);
          this.updateSession(botId, {
            status: 'qr',
            lastQr: qrDataUrl,
            lastQrAt: new Date().toISOString()
          });
        }

        if (update.connection === 'open') {
          const userId = sock.user?.id || '';
          const phone = userId ? `+${userId.split('@')[0]}` : session.phone;
          this.updateSession(botId, {
            status: 'connected',
            connectedAt: new Date().toISOString(),
            phone,
            client: sock,
            lastQr: null,
            error: null,
            retryCount: 0
          });
        }

        if (update.connection === 'close') {
          const statusCode = update?.lastDisconnect?.error?.output?.statusCode;
          const isLoggedOut = statusCode === DisconnectReason.loggedOut;
          const needsRestart = statusCode === DisconnectReason.restartRequired;
          const current = this.sessions.get(key);
          const nextRetry = (current?.retryCount || 0) + 1;
          const wasManual = current?.manualDisconnect;

          if (wasManual || isLoggedOut) {
            this.updateSession(botId, {
              status: 'disconnected',
              client: null,
              retryCount: nextRetry,
              error: isLoggedOut ? 'Session logged out.' : null
            });
            return;
          }

          if (needsRestart) {
            this.updateSession(botId, {
              status: 'connecting',
              client: null,
              retryCount: nextRetry,
              error: null
            });
            setTimeout(() => {
              this.reconnect(botId);
            }, 1000);
            return;
          }

          this.updateSession(botId, {
            status: 'connecting',
            client: null,
            retryCount: nextRetry,
            error: null
          });

          if (nextRetry <= 5) {
            const delayMs = 3000 * nextRetry;
            setTimeout(() => {
              this.connect(botId);
            }, delayMs);
          }
        }
      });

      sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        const message = messages?.[0];
        if (!message || message.key?.fromMe) return;

        const remoteJid = message.key?.remoteJid || '';
        if (remoteJid.endsWith('@g.us')) return;

        const text =
          message.message?.conversation ||
          message.message?.extendedTextMessage?.text ||
          message.message?.imageMessage?.caption ||
          message.message?.videoMessage?.caption ||
          '';

        if (!text.trim()) return;

        try {
          const promptData = await db.getPrompt(botId);
          const systemPrompt = promptData?.prompt_text || null;
          const convId = `whatsapp:${botId}:${remoteJid}`;
          const { text: reply } = await ai.generate(
            text,
            systemPrompt,
            convId
          );

          await sock.sendMessage(remoteJid, { text: reply || '...' });
        } catch (error) {
          console.error('WhatsApp message error:', error);
        }
      });

      return this.toPublic(
        this.updateSession(botId, {
          client: sock
        })
      );
    } catch (error) {
      const failed = this.updateSession(botId, {
        status: 'error',
        error: error?.message || 'Failed to connect.'
      });
      return this.toPublic(failed);
    }
  }

  async disconnect(botId) {
    const key = String(botId);
    const session = this.sessions.get(key);

    try {
      await session?.client?.logout();
      session?.client?.end?.();
    } catch {
      // ignore shutdown errors
    }

    const updated = this.updateSession(botId, {
      status: 'disconnected',
      lastQr: null,
      error: null,
      client: null,
      retryCount: 0,
      manualDisconnect: true
    });

    return this.toPublic(updated);
  }

  async reconnect(botId) {
    const key = String(botId);
    const session = this.sessions.get(key);

    try {
      session?.client?.end?.();
    } catch {
      // ignore shutdown errors
    }

    this.updateSession(botId, {
      status: 'connecting',
      error: null,
      manualDisconnect: false
    });

    return this.connect(botId);
  }

  async reset(botId) {
    const key = String(botId);
    const session = this.sessions.get(key);

    try {
      await session?.client?.logout();
      session?.client?.end?.();
    } catch {
      // ignore shutdown errors
    }

    const userDataDir = path.resolve('tokens', `baileys-bot-${botId}`);
    try {
      await fs.rm(userDataDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }

    const updated = this.updateSession(botId, {
      status: 'disconnected',
      lastQr: null,
      error: null,
      client: null,
      retryCount: 0,
      manualDisconnect: true
    });

    return this.toPublic(updated);
  }
}

export const whatsappManager = new WhatsappManager();

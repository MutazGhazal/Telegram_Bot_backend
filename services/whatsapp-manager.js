import wppconnect from '@wppconnect-team/wppconnect';
import path from 'path';
import fs from 'fs/promises';

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
      client: data.client || null
    };
  }

  toPublic(session) {
    if (!session) return null;
    const { client, lastQr, ...publicSession } = session;
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

  async connect(botId, data = {}) {
    const key = String(botId);
    const existing = this.sessions.get(key);

    if (existing?.status === 'connected' || existing?.status === 'connecting') {
      return this.toPublic(existing);
    }

    if (existing?.client) {
      try {
        await existing.client.logout?.();
        await existing.client.close?.();
      } catch {
        // ignore cleanup errors
      }
    }

    const userDataDir = path.resolve('tokens', `bot-${botId}`);
    await fs.mkdir(userDataDir, { recursive: true });

    const session = this.updateSession(botId, {
      sessionName: existing?.sessionName || `bot-${botId}`,
      phone: existing?.phone || null,
      webhookUrl: existing?.webhookUrl || null,
      status: 'connecting',
      error: null
    });

    try {
    const client = await wppconnect.create({
        session: session.sessionName,
        headless: true,
        puppeteerOptions: {
          userDataDir,
          executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-zygote',
            '--single-process'
          ]
        },
        catchQR: (base64Qrimg) => {
          this.updateSession(botId, {
            status: 'qr',
            lastQr: base64Qrimg,
            lastQrAt: new Date().toISOString()
          });
        },
        statusFind: (statusSession) => {
          this.updateSession(botId, {
            status: String(statusSession || '').toLowerCase() || 'connecting'
          });
        }
      });

      let phone = session.phone;
      const wid = client?.info?.wid?.user || client?.info?.me?.user;
      if (!phone && wid) {
        phone = `+${wid}`;
      }

      const connectedSession = this.updateSession(botId, {
        status: 'connected',
        connectedAt: new Date().toISOString(),
        phone,
        client,
        lastQr: null
      });

      return this.toPublic(connectedSession);
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
      await session?.client?.logout?.();
      await session?.client?.close?.();
    } catch {
      // ignore shutdown errors
    }

    const updated = this.updateSession(botId, {
      status: 'disconnected',
      lastQr: null,
      error: null,
      client: null
    });

    return this.toPublic(updated);
  }
}

export const whatsappManager = new WhatsappManager();

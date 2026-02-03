import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import config from '../config.js';

const router = express.Router();
const rootPath = path.resolve(config.files?.root || process.cwd());

const normalizePath = (requestedPath = '') => {
  const normalizedInput = String(requestedPath).replace(/\\/g, '/');
  const resolvedPath = path.resolve(rootPath, normalizedInput);
  const relativePath = path.relative(rootPath, resolvedPath);

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return null;
  }

  return { resolvedPath, relativePath };
};

router.get('/', async (req, res) => {
  const requestedPath = req.query.path || '';
  const normalized = normalizePath(requestedPath);

  if (!normalized) {
    return res.status(400).json({ error: 'Invalid path.' });
  }

  try {
    const entries = await fs.readdir(normalized.resolvedPath, {
      withFileTypes: true
    });

    const items = await Promise.all(
      entries.map(async (entry) => {
        const entryPath = path.join(normalized.resolvedPath, entry.name);
        let stats = null;

        try {
          stats = await fs.stat(entryPath);
        } catch {
          stats = null;
        }

        return {
          name: entry.name,
          path: path.relative(rootPath, entryPath).replace(/\\/g, '/'),
          type: entry.isDirectory() ? 'directory' : 'file',
          size: entry.isFile() && stats ? stats.size : null,
          modifiedAt: stats ? stats.mtime.toISOString() : null
        };
      })
    );

    items.sort((a, b) => {
      if (a.type === b.type) {
        return a.name.localeCompare(b.name);
      }
      return a.type === 'directory' ? -1 : 1;
    });

    return res.json({
      root: rootPath,
      path: normalized.relativePath.replace(/\\/g, '/'),
      items
    });
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return res.status(404).json({ error: 'Path not found.' });
    }

    if (error?.code === 'ENOTDIR') {
      return res.status(400).json({ error: 'Path is not a directory.' });
    }

    return res.status(500).json({ error: 'Failed to read directory.' });
  }
});

export default router;

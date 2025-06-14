const express = require('express');
const fs = require('fs');
const app = express();
const port = 3000;

app.use(express.json());

// Password protection for admin.html
app.use('/admin.html', (req, res, next) => {
  const auth = req.headers.authorization;
  const expected = 'Basic ' + Buffer.from('admin:Penisgun13@').toString('base64'); // change this!

  if (auth === expected) {
    next();
  } else {
    res.setHeader('WWW-Authenticate', 'Basic realm="Admin Area"');
    res.status(401).send('Authentication required.');
  }
});

app.use(express.static('public'));



// Load keys from keys.json
function loadKeys() {
  if (!fs.existsSync('keys.json')) fs.writeFileSync('keys.json', '[]');
  return JSON.parse(fs.readFileSync('keys.json'));
}

// Save keys to keys.json
function saveKeys(keys) {
  fs.writeFileSync('keys.json', JSON.stringify(keys, null, 2));
}

// Load logs from logs.json
function loadLogs() {
  if (!fs.existsSync('logs.json')) fs.writeFileSync('logs.json', '[]');
  return JSON.parse(fs.readFileSync('logs.json'));
}

// Save logs to logs.json
function saveLogs(logs) {
  fs.writeFileSync('logs.json', JSON.stringify(logs, null, 2));
}

// ✨ Generate a new key (internal API)
app.post('/generatekey', (req, res) => {
  const keys = loadKeys();
  const newKey = {
    key: Math.random().toString(36).substring(2, 10).toUpperCase(),
    used: false,
    boundTo: null,
    expiresAt: null,
    createdAt: new Date().toISOString()
  };
  keys.push(newKey);
  saveKeys(keys);
  res.json(newKey);
});

// ✅ Check key from user script
app.get('/checkkey', (req, res) => {
  const { key, userid, ip } = req.query;
  if (!key || !userid) return res.status(400).json({ success: false, message: "Missing key or userid" });

  const keys = loadKeys();
  const found = keys.find(k => k.key === key);

  if (!found) return res.status(404).json({ success: false, message: "Key not found" });

  const expired = found.expiresAt && new Date(found.expiresAt) < new Date();
  if (expired) return res.status(403).json({ success: false, message: "Key expired" });

  if (!found.used) {
    found.used = true;
    found.boundTo = userid || ip || 'Unknown';
    saveKeys(keys);

    const logs = loadLogs();
    logs.push({
      key,
      userid,
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      timestamp: new Date().toISOString()
    });
    saveLogs(logs);
  }

  if (found.boundTo && found.boundTo !== userid) {
    return res.status(403).json({ success: false, message: "Key is already bound to another user" });
  }

  res.json({ success: true, message: "✅ Key is valid and active!" });
});

// 🛠 Admin: View all keys
app.get('/adminkeys', (req, res) => {
  const keys = loadKeys();
  keys.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  res.json(keys);
});

// 🛠 Admin: Generate key manually
app.post('/adminkeys/generate', (req, res) => {
  const { expiresAt } = req.body;
  const keys = loadKeys();
  const key = Math.random().toString(36).substring(2, 10).toUpperCase();

  const newKey = {
    key,
    used: false,
    boundTo: null,
    expiresAt,
    createdAt: new Date().toISOString()
  };

  keys.push(newKey);
  saveKeys(keys);
  res.json(newKey);
});

// 🛠 Admin: Revoke a key
app.post('/adminkeys/revoke', (req, res) => {
  const { key } = req.body;
  let keys = loadKeys();
  const found = keys.find(k => k.key === key);
  if (!found) return res.status(404).json({ success: false, message: 'Key not found' });

  found.used = true;
  found.expiresAt = new Date().toISOString();
  saveKeys(keys);
  res.json({ success: true, message: 'Key revoked.' });
});

// 🛠 Admin: View logs
app.get('/adminkeys/logs', (req, res) => {
  const logs = loadLogs();
  res.json(logs);
});

// 🧪 Test server
app.get('/', (req, res) => {
  res.send('✅ Key system backend is running.');
});

// 🚀 Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

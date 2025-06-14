const express = require('express');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const app = express();

app.use(express.json());
app.use(express.static('public'));

const port = process.env.PORT || 3000;
const KEYS_FILE = 'keys.json';

// Load or initialize keys
function loadKeys() {
  try {
    return JSON.parse(fs.readFileSync(KEYS_FILE));
  } catch {
    return [];
  }
}

// Save keys
function saveKeys(keys) {
  fs.writeFileSync(KEYS_FILE, JSON.stringify(keys, null, 2));
}

// ✅ Generate Key Endpoint
app.post('/generatekey', (req, res) => {
  const keys = loadKeys();
  const newKey = {
    key: uuidv4(),
    used: false,
    userid: null,
    createdAt: Date.now(),
    expiresAt: Date.now() + 1000 * 60 * 60 * 12 // 12 hours
  };
  keys.push(newKey);
  saveKeys(keys);
  res.json({ success: true, key: newKey.key });
});

// ✅ Check Key Endpoint
app.get('/checkkey', (req, res) => {
  const { key, userid } = req.query;
  if (!key || !userid) {
    return res.json({ success: false, message: "Missing key or userid" });
  }

  const keys = loadKeys();
  const found = keys.find(k => k.key === key);

  if (!found) {
    return res.json({ success: false, message: "Key not found" });
  }

  if (found.expiresAt < Date.now()) {
    return res.json({ success: false, message: "Key expired" });
  }

  if (!found.userid) {
    found.userid = userid;
    found.used = true;
    saveKeys(keys);
    return res.json({ success: true, message: "Key bound and valid" });
  }

  if (found.userid !== userid) {
    return res.json({ success: false, message: "Key bound to different user" });
  }

  return res.json({ success: true, message: "Key is valid" });
});

// ✅ Start Server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

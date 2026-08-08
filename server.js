const express = require('express');
const path = require('path');
const multer = require('multer');

const app = express();

// إعداد multer بحجم أقصى 4.5MB لتوافق تام مع حدود Vercel Serverless
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 4.5 * 1024 * 1024 } 
});

let messages = [];

// زيادة حدود استلام الـ JSON ليتسع لبيانات Base64 للملفات والصور
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/messages', (req, res) => {
    res.json(messages);
});

// مسار رفع الملفات وتحويلها لـ Base64 Data URL
app.post('/api/upload', (req, res) => {
    upload.single('file')(req, res, (err) => {
        if (err) {
            return res.status(400).json({ error: 'File too large or upload error' });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const mimeType = req.file.mimetype;
        const base64 = req.file.buffer.toString('base64');
        const fileUrl = `data:${mimeType};base64,${base64}`;
        const fileType = mimeType.startsWith('image/') ? 'image' : 'file';

        res.json({ 
            url: fileUrl, 
            type: fileType, 
            originalName: req.file.originalname 
        });
    });
});

app.post('/api/messages', (req, res) => {
    const { text, sender, replyTo, file } = req.body;

    if (text || file) {
        const newMsg = { 
            id: "m_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
            sender: String(sender || 'Anonymous'), 
            text: text ? String(text) : '',
            file: file || null,
            replyTo: (replyTo && replyTo.text) ? replyTo : null,
            reactions: {}
        };
        messages.push(newMsg);
    }
    res.json({ status: 'ok' });
});

app.post('/api/react', (req, res) => {
    const { id, emoji } = req.query;
    const msg = messages.find(m => String(m.id) === String(id));
    if (msg) {
        if (!msg.reactions) msg.reactions = {};
        msg.reactions[emoji] = (msg.reactions[emoji] || 0) + 1;
    }
    res.json({ status: 'ok' });
});

app.post('/api/delete', (req, res) => {
    const targetId = String(req.query.id);
    messages = messages.filter(msg => String(msg.id) !== targetId);
    res.json({ status: 'ok' });
});

app.get('*', (req, res) => {
    const indexPath = path.join(__dirname, 'public', 'index.html');
    res.sendFile(indexPath, (err) => {
        if (err) {
            res.sendFile(path.join(__dirname, 'index.html'));
        }
    });
});

module.exports = app;

if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}
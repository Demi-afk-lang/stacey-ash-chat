const express = require('express');
const multer = require('multer');
const path = require('path');

const app = express();

app.use(express.json());
app.use(express.static('public'));

// استخدام Memory Storage ليتوافق مع Serverless Environment
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 4 * 1024 * 1024 } // 4MB Max
});

let messages = [];

app.get('/api/messages', (req, res) => {
    res.json(messages);
});

app.post('/api/messages', upload.single('file'), (req, res) => {
    const { sender, text } = req.body;
    let fileData = null;

    if (req.file) {
        // تحويل الملف لـ Base64 لعدم الحاجة للتخزين على الهارد
        const mimeType = req.file.mimetype;
        const base64 = req.file.buffer.toString('base64');
        fileData = `data:${mimeType};base64,${base64}`;
    }

    const newMessage = {
        id: Date.now().toString(),
        sender,
        text: text || '',
        file: fileData,
        reactions: {}
    };
    messages.push(newMessage);
    res.json({ success: true, message: newMessage });
});

app.post('/api/reactions', (req, res) => {
    const { msgId, emoji } = req.body;
    const msg = messages.find(m => m.id === msgId);
    if (msg) {
        msg.reactions[emoji] = (msg.reactions[emoji] || 0) + 1;
    }
    res.json({ success: true, reactions: msg ? msg.reactions : {} });
});

app.delete('/api/messages', (req, res) => {
    messages = [];
    res.json({ success: true });
});

module.exports = app;

if (require.main === module) {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}
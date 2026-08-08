const express = require('express');
const path = require('path');
const multer = require('multer');

const app = express();

// استخدام Memory Storage بدلاً من Disk Storage لتوافق Vercel
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // حد أقصى 10 ميجا
});

// مصفوفة الذاكرة لحفظ الرسائل مؤقتاً
let messages = [];

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// جلب الرسائل
app.get('/api/messages', (req, res) => {
    res.json(messages);
});

// رفع الملفات وتحويلها لـ Base64 لتعمل بدون Storage محلي
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const mimeType = req.file.mimetype;
    const base64 = req.file.buffer.toString('base64');
    const fileUrl = `data:${mimeType};base64,${base64}`;
    const fileType = mimeType.startsWith('image/') ? 'image' : 'file';

    res.json({ url: fileUrl, type: fileType, originalName: req.file.originalname });
});

// إضافة رسالة جديدة
app.post('/api/messages', (req, res) => {
    const { text, sender, replyTo, file } = req.body;

    if (text || file) {
        const newMsg = { 
            id: "m_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
            sender: String(sender), 
            text: text ? String(text) : '',
            file: file || null,
            replyTo: (replyTo && replyTo.text) ? replyTo : null
        };
        messages.push(newMsg);
    }
    res.json({ status: 'ok' });
});

// حذف رسالة
app.post('/api/delete', (req, res) => {
    const targetId = String(req.query.id);
    messages = messages.filter(msg => String(msg.id) !== targetId);
    res.json({ status: 'ok' });
});

// توجيه المسار الرئيسي إلى الصفحة الرئيسية
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

module.exports = app;

if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}
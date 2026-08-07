const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();

// إعداد مجلد الملفات المرفوعة
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// مسار وملف حفظ البيانات المحلي (JSON Database)
const dbFilePath = path.join(__dirname, 'messages.json');

// دالة لقراءة الرسائل من الملف
function loadMessages() {
    if (!fs.existsSync(dbFilePath)) {
        fs.writeFileSync(dbFilePath, JSON.stringify([]));
        return [];
    }
    try {
        const data = fs.readFileSync(dbFilePath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return [];
    }
}

// دالة لحفظ الرسائل في الملف
function saveMessages(messages) {
    fs.writeFileSync(dbFilePath, JSON.stringify(messages, null, 2), 'utf8');
}

// تحميل الرسائل عند بدء السيرفر
let messages = loadMessages();

// إعدادات Multer للرفع
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'file-' + uniqueSuffix + ext);
    }
});
const upload = multer({ storage: storage, limits: { fileSize: 25 * 1024 * 1024 } });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/messages', (req, res) => {
    res.json(messages);
});

app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const fileUrl = '/uploads/' + req.file.filename;
    const fileType = req.file.mimetype.startsWith('image/') ? 'image' : 'file';

    res.json({ url: fileUrl, type: fileType, originalName: req.file.originalname });
});

app.post('/api/messages', (req, res) => {
    const text = req.body.text;
    const sender = req.body.sender;
    const replyTo = req.body.replyTo;
    const file = req.body.file;

    if (text || file) {
        const newMsg = { 
            id: "m_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
            sender: String(sender), 
            text: text ? String(text) : '',
            file: file || null,
            replyTo: (replyTo && replyTo.text) ? replyTo : null
        };
        messages.push(newMsg);
        
        // حفظ القائمة في الملف المحلي تلقائياً
        saveMessages(messages);
    }
    res.json({ status: 'ok' });
});

app.post('/api/delete', (req, res) => {
    const targetId = String(req.query.id);
    messages = messages.filter(msg => String(msg.id) !== targetId);
    
    // تحديث الملف بعد الحذف
    saveMessages(messages);
    res.json({ status: 'ok' });
});

app.listen(3000, '0.0.0.0', () => {
    console.log('Server running on port 3000');
});
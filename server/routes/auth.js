import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { mkdirp } from 'mkdirp';

const router = express.Router();

// --- Setup --- 
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey';
const USERS_DB_PATH = path.join(__dirname, '../data/users.json');
const UPLOADS_DIR = path.join(__dirname, '../uploads/avatars');

// Ensure directories exist
console.log('[AUTH] Creating directories...');
console.log('[AUTH] UPLOADS_DIR:', UPLOADS_DIR);
mkdirp.sync(path.dirname(USERS_DB_PATH));
mkdirp.sync(UPLOADS_DIR);

// --- User Database (JSON file) ---
const readUsers = () => {
  try {
    if (!fs.existsSync(USERS_DB_PATH)) {
      // Create default admin user if file doesn't exist
      const salt = bcrypt.genSaltSync(10);
      const adminUser = {
        id: '1',
        username: 'admin',
        name: 'Administrator',
        passwordHash: bcrypt.hashSync('admin123', salt),
        profilePictureUrl: null
      };
      fs.writeFileSync(USERS_DB_PATH, JSON.stringify([adminUser], null, 2));
      return [adminUser];
    }
    const data = fs.readFileSync(USERS_DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading users DB:", error);
    return [];
  }
};

const writeUsers = (users) => {
  try {
    fs.writeFileSync(USERS_DB_PATH, JSON.stringify(users, null, 2));
  } catch (error) {
    console.error("Error writing to users DB:", error);
  }
};

// --- JWT Middleware ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.status(401).json({ message: 'Token tidak ditemukan. Akses ditolak.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Token tidak valid. Akses ditolak.' });
    req.user = user;
    next();
  });
};

// --- Helper to generate a new token ---
const generateToken = (user) => {
    return jwt.sign({
        id: user.id,
        username: user.username,
        name: user.name,
        profilePictureUrl: user.profilePictureUrl
    }, JWT_SECRET, { expiresIn: '8h' });
}

// --- Routes ---

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Username dan password harus diisi' });
  }

  const users = readUsers();
  const user = users.find((u) => u.username === username);

  if (!user) {
    return res.status(401).json({ message: 'Username atau kata sandi salah' });
  }

  try {
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Username atau kata sandi salah' });
    }

    const token = generateToken(user);
    res.json({ message: 'Login successful', token });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
});

router.post('/update-profile', authenticateToken, (req, res) => {
    const { name, username } = req.body;
    let users = readUsers();
    const userIndex = users.findIndex(u => u.id === req.user.id);

    if (userIndex === -1) {
        return res.status(404).json({ message: 'Pengguna tidak ditemukan' });
    }

    // Check if new username is already taken
    if (users.some(u => u.username === username && u.id !== req.user.id)) {
        return res.status(400).json({ message: 'Username sudah digunakan' });
    }

    users[userIndex] = { ...users[userIndex], name, username };
    writeUsers(users);

    const updatedUser = users[userIndex];
    const token = generateToken(updatedUser);

    res.json({ message: 'Profil berhasil diperbarui', token });
});

router.post('/change-password', authenticateToken, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    let users = readUsers();
    const userIndex = users.findIndex(u => u.id === req.user.id);

    if (userIndex === -1) {
        return res.status(404).json({ message: 'Pengguna tidak ditemukan' });
    }

    const user = users[userIndex];
    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
        return res.status(400).json({ message: 'Kata sandi saat ini salah' });
    }

    const salt = await bcrypt.genSalt(10);
    users[userIndex].passwordHash = await bcrypt.hash(newPassword, salt);
    writeUsers(users);

    res.json({ message: 'Kata sandi berhasil diubah' });
});

// --- Multer setup for file uploads ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        // req.user is available here thanks to the authenticateToken middleware
        if (!req.user || !req.user.id) {
            return cb(new Error('User not authenticated for file upload'));
        }
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, req.user.id + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Error: File upload only supports the following filetypes - ' + filetypes));
    }
});


router.post('/upload-picture', authenticateToken, upload.single('profilePicture'), (req, res) => {
    // The 'upload.single' middleware handles the file upload and potential errors.
    // If an error occurs in multer, it will be passed to the Express error handler.
    // We can add a custom error handler for multer if needed, but for now, this is cleaner.
    
    // If we reach here, the file has been uploaded successfully.
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'File tidak terunggah' });
        }

        console.log('[AUTH] File uploaded:', req.file);
        let users = readUsers();
        const userIndex = users.findIndex(u => u.id === req.user.id);
        if (userIndex === -1) {
            return res.status(404).json({ message: 'Pengguna tidak ditemukan' });
        }

        // Construct the URL path for the uploaded file
        const profilePictureUrl = `/uploads/avatars/${req.file.filename}`;
        users[userIndex].profilePictureUrl = profilePictureUrl;
        writeUsers(users);

        const updatedUser = users[userIndex];
        const token = generateToken(updatedUser);

        res.json({ message: 'Foto profil berhasil diunggah', token, profilePictureUrl });
    } catch (error) {
        console.error('[AUTH] Error processing uploaded picture:', error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server saat memproses gambar.' });
    }
});

export default router;
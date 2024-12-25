import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import swaggerJsDoc from 'swagger-jsdoc';
import swaggerUI from 'swagger-ui-express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const videosDir = path.join(__dirname, 'videos'); // Cambiado a directorio local

// Agregar log para debug
console.log('Directorio de videos:', videosDir);

if (!fs.existsSync(videosDir)) {
  console.log('Creando directorio de videos...');
  fs.mkdirSync(videosDir, { recursive: true });
}

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0'; // Asegura que escuche en todas las interfaces de red

// Configurar CORS específicamente para tu frontend
app.use(cors({
  origin: process.env.FRONTEND_URL || '*', // URL de tu frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Métodos permitidos
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API de Videos',
      version: '1.0.0',
      description: 'API para streaming de videos',
    },
    servers: [
      {
        url: `http://${process.env.API_HOST || 'localhost'}:${process.env.PORT || 5000}`,
        description: 'Servidor de Videos'
      },
    ],
  },
  apis: ['./server.js'],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerDocs));

/**
 * @swagger
 * /api/videos:
 *   get:
 *     summary: Obtiene la lista de videos disponibles
 *     responses:
 *       200:
 *         description: Lista de videos
 */
app.get('/api/videos', (req, res) => {
  console.log('Buscando videos en:', videosDir); // Agregar log para debug
  fs.readdir(videosDir, (err, files) => {
    if (err) {
      console.error('Error al leer directorio:', err); // Agregar log para debug
      return res.status(500).json({ error: 'Error al leer los videos' });
    }
    const videos = files.filter(file => file.match(/\.(mp4|mkv|avi)$/));
    console.log('Videos encontrados:', videos); // Agregar log para debug
    res.json(videos);
  });
});

/**
 * @swagger
 * /api/video/{filename}:
 *   get:
 *     summary: Obtiene un video específico
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         description: Nombre del archivo
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Stream del video
 */
app.get('/api/video/:filename', (req, res) => {
  try {
    const filename = decodeURIComponent(req.params.filename).replace(/["']/g, '');
    const videoPath = path.join(videosDir, filename);
    
    console.log('Intentando acceder al video:', videoPath); // Agregar log para debug

    if (!fs.existsSync(videoPath)) {
      console.log('Video no encontrado:', videoPath); // Agregar log para debug
      return res.status(404).json({ error: 'Video no encontrado' });
    }

    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize-1;
      const chunksize = (end-start)+1;
      
      const file = fs.createReadStream(videoPath, {start, end});
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
      };
      res.writeHead(200, head);
      fs.createReadStream(videoPath).pipe(res);
    }
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.listen(PORT, HOST, () => {
  console.log(`Servidor corriendo en http://${HOST}:${PORT}`);
  console.log(`Swagger disponible en http://${HOST}:${PORT}/api-docs`);
});

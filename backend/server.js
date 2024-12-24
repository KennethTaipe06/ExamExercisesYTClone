import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import swaggerJsDoc from 'swagger-jsdoc';
import swaggerUI from 'swagger-ui-express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const videosDir = path.join(__dirname, '..', 'videos');

// Crear directorio de videos si no existe
if (!fs.existsSync(videosDir)) {
  fs.mkdirSync(videosDir, { recursive: true });
}

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
        url: 'http://localhost:5000',
      },
    ],
  },
  apis: ['./server.js'],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

const app = express();
const PORT = 5000;
const HOST = '0.0.0.0';

app.use(cors());
app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerDocs));

/**
 * @swagger
 * /api/videos:
 *   get:
 *     summary: Obtiene la lista de videos disponibles
 *     responses:
 *       200:
 *         description: Lista de videos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 *       500:
 *         description: Error al leer los videos
 */
app.get('/api/videos', (req, res) => {
  fs.readdir(videosDir, (err, files) => {
    if (err) {
      return res.status(500).json({ error: 'Error al leer los videos' });
    }
    const videos = files.filter(file => file.match(/\.(mp4|mkv|avi)$/));
    res.json(videos);
  });
});

/**
 * @swagger
 * /api/video/{filename}:
 *   get:
 *     summary: Obtiene un video específico para streaming
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         description: Nombre del archivo de video
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Stream del video
 *         content:
 *           video/mp4:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Video no encontrado
 */
app.get('/api/video/:filename', (req, res) => {
  try {
    // Eliminar cualquier comilla del nombre del archivo
    const filename = decodeURIComponent(req.params.filename).replace(/["']/g, '');
    const videoPath = path.join(__dirname, '..', 'videos', filename);

    // Verificar si el archivo existe
    if (!fs.existsSync(videoPath)) {
      console.error('Video no encontrado:', videoPath);
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
      
      try {
        const file = fs.createReadStream(videoPath, {start, end});
        const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': 'video/mp4',
        };
        res.writeHead(206, head);
        file.pipe(res);
      } catch (streamError) {
        console.error('Error en streaming:', streamError);
        res.status(500).json({ error: 'Error al transmitir el video' });
      }
    } else {
      try {
        const head = {
          'Content-Length': fileSize,
          'Content-Type': 'video/mp4',
        };
        res.writeHead(200, head);
        fs.createReadStream(videoPath).pipe(res);
      } catch (streamError) {
        console.error('Error en streaming:', streamError);
        res.status(500).json({ error: 'Error al transmitir el video' });
      }
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.listen(PORT, HOST, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`Swagger disponible en http://localhost:${PORT}/api-docs`);
});

const express = require("express");
const prisma = require('./src/prisma-cliente'); // Importa el cliente Prisma extendido
const app = express();
const PORT = process.env.PORT || 5000;
const apiRouter = require('./src/routes'); // Importo el index donde están las rutas

// Middleware para parsear JSON y datos URL-encoded
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware para inyectar el userId
app.use((req, res, next) => {
    // Supongamos que el usuario está autenticado y su información está en req.user
    // Esto depende de cómo estés manejando la autenticación en tu proyecto
    prisma.userId = req.user?.id || 'anonymous'; // Si no hay usuario, usa "anonymous"
    next();
});

// Rutas principales
app.use("/api", apiRouter);

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
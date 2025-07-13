const express = require("express");
const morgan = require("morgan");
const prisma = require('./src/prisma-client'); // Importa el cliente Prisma extendido
const rateLimit = require("express-rate-limit"); // Importa express-rate-limit
const app = express();
const PORT = process.env.PORT || 5000;
const apiRouter = require('./src/routes'); // Importo el index donde están las rutas
const cors = require("cors");

app.use(cors());
/* app.use(cors({
  origin: 'https://front3vuetify.onrender.com',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
})); */
// Middleware para parsear JSON y datos URL-encoded
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware para inyectar el userId
app.use((req, res, next) => {
    // Supongamos que el usuario está autenticado y su información está en req.user
    // Esto depende de cómo estés manejando la autenticación en tu proyecto
/*     prisma.userId = req.user?.id || 'anonymous'; // Si no hay usuario, usa "anonymous"
 */    prisma.userId = "testUser"; // Valor temporal para pruebas
    next();
});

// Configuración de Rate Limit
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // Ventana de tiempo de 15 minutos
    max: 100, // Límite de 100 solicitudes por IP por ventana
    message: "Demasiadas solicitudes desde esta IP, intenta nuevamente después de 15 minutos.",
    standardHeaders: true, // Devuelve información de límites en los encabezados `RateLimit-*`
    legacyHeaders: false, // Desactiva los encabezados `X-RateLimit-*`
});

// Aplicar Rate Limit solo a las rutas bajo "/api"
app.use("/api", apiLimiter);
// Rutas principales
app.use("/api", apiRouter);



// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

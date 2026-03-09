const express = require("express");
const morgan = require("morgan");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const app = express();
const PORT = process.env.PORT || 5000;
const apiRouter = require('./src/routes');
const cors = require("cors");

const allowedOrigins = [
  'https://gomaint.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'https://gomaint.com.co',
  'https://www.gomaint.com.co',
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  methods: ['GET', 'PATCH', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));
// Headers de seguridad HTTP
app.use(helmet());

// Middleware para parsear JSON y datos URL-encoded
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

const express = require("express");
const app = express();
const PORT = process.env.PORT || 5000;
const apiRouter = require('./src/routes');//Importo el index donde están las rutas


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

app.use("/api", apiRouter);
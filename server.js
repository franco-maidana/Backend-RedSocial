import dotenv from 'dotenv'
import express from "express";
import cors from "cors";
import connection from "./database/conecction.js";
import indexRouter from "./router/index.router.js";

// Cargar las variables de entorno desde el archivo .env
dotenv.config();

const server = express();
const PORT = process.env.PORT;

const ready = () => {
  console.log("server ready on port:" + ' ' + PORT);
  connection();
};

// Middlewares
server.use(cors({
  origin: true,
  credentials: true
}));

server.use(express.json());
server.use(express.urlencoded({ extended: true }));

// Rutas
server.use("/", indexRouter);

// Iniciar el servidor
server.listen(PORT, ready);

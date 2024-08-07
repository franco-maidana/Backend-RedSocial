import dotenv from 'dotenv'
import express from "express";
import cors from "cors";
import connection from "./database/conecction.js";
import indexRouter from "./router/index.router.js";

// Cargar las variables de entorno desde el archivo .env
dotenv.config();

const server = express();
const PUERTO = process.env.PUERTO;

const ready = () => {
  console.log("server ready on port :" + PUERTO);
  connection();
};

// Middlewares
server.use(cors({
  origin: 'https://frond-end-red-social-react.vercel.app',
  credentials: true
}));

server.use(express.json());
server.use(express.urlencoded({ extended: true }));

// Rutas
server.use("/", indexRouter);

// Iniciar el servidor
server.listen(PUERTO, ready);

import mongoose from "mongoose";

const connection = async () => {
  try {
    await mongoose.connect(process.env.CONECCION_MONGO)
    console.log("Conectado correctamente a la base de datos de mi Red Social")
  } catch (error) {
    console.log(error)
    throw new Error("No se ha podido conectar a la base de datos !!")
  }
}

export default connection
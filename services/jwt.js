import JWT from "jsonwebtoken";
import moment from "moment";


// Crear una función para generar token
const createToken = (user) => {
  const payload = {
    id: user._id,
    name: user.name,
    surname: user.surname,
    nick: user.nick,
    email: user.email,
    role: user.role,
    imagen: user.image,
    iat: moment().unix(),
    exp: moment().add(30, "days").unix(),
  };

  // Devolver un jwt codificado  agregamos la clave secreta del jwt del .env aca 
  return JWT.sign(payload, process.env.SECRET);
}

export {  createToken };

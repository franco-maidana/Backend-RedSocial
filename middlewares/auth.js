import JWT from "jsonwebtoken";
import moment from "moment";

const authenticate = (req, res, next) => {
  // Comprobar si me llegó la cabecera de auth
  if (!req.headers.authorization) {
    return res.status(403).json({
      statusCode: 403,
      message: "La petición no tiene la cabecera de autenticación",
    });
  }

  // Limpiar el token
  const token = req.headers.authorization.replace(/['"]+/g, "");

  // Decodificar y verificar el token traemos la clave secreta del .env
  try {
    const payload = JWT.verify(token, process.env.SECRET);
    // Comprobar la expiración del token
    if (payload.exp <= moment().unix()) {
      return res.status(401).json({
        statusCode: 401,
        message: "Token Expirado",
      });
    }
    // Agregar datos de usuario a request
    req.user = payload;
    // Pasar a la siguiente acción
    next();
  } catch (error) {
    return res.status(404).json({
      statusCode: 404,
      message: "Token inválido",
      error: error.message, // Devolver el mensaje de error específico
    });
  }
};

export default authenticate;

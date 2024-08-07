import { Router } from "express";
import bcrypt from "bcrypt";
import UsuariosModel from "../../models/user.models.js";
import { createToken } from "../../services/jwt.js";
import authenticate from "../../middlewares/auth.js";
import multer from "multer";  // subida de imagenes 
import fs from 'fs';
import path from "path";
import { followThisUser, followUsersIds } from '../../services/followUsersId.js'
import FollowedModel from "../../models/follow.model.js";
import PublicacionModel from "../../models/publication.models.js";

// Configuracion de subida de imagenes
const storage = multer.diskStorage({
  destination: (req, file , cb) => {
    cb(null, "./uploads/avatar/")
  },

  filename: (req, file , cb)=> {
    cb(null, 'Avatar' + Date.now() + '_' + file.originalname)
  },
})

const uploads = multer({storage})

const userRouter = Router();

userRouter.get("/prueba", authenticate, async (req, res) => {
  try {
    return res.json({
      statusCode: 200,
      mesagge: "Esto esta de pruba para probar las rutas de users ",
      usuario: req.user, // son todos los datos del token descodificado
    });
  } catch (error) {
    throw error;
  }
});

userRouter.post('/register', async (req, res) => {
  const { name, email, password, nick } = req.body;

  // Validación de datos
  if (!name || !email || !password || !nick) {
    return res.status(400).json({
      statusCode: 400,
      message: 'Faltan datos por enviar',
    });
  }

  

  try {
    // Verificar si el email ya está en uso
    const emailInUse = await UsuariosModel.findOne({ email: email.toLowerCase() });

    if (emailInUse) {
      return res.status(409).json({
        statusCode: 409,
        message: 'El correo electrónico ya está registrado. Por favor, utiliza otro correo.',
      });
    }

    // Verificar si el nick ya está en uso
    const nickInUse = await UsuariosModel.findOne({ nick: nick.toLowerCase() });

    if (nickInUse) {
      return res.status(409).json({
        statusCode: 409,
        message: 'El nick ya está en uso. Por favor, elige otro nick.',
      });
    }

    // Cifrar la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear y guardar el nuevo usuario
    const newUser = new UsuariosModel({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      nick: nick.toLowerCase(),
    });

    const userStored = await newUser.save();

    // Devolver los resultados
    return res.status(200).json({
      statusCode: 200,
      message: 'Usuario registrado correctamente',
      user: userStored,
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: 500,
      message: 'Error en la consulta de usuarios',
    });
  }
});

userRouter.post("/login", async (req, res) => {
  // Agarramos los parámetros que vienen del body/formulario
  const datos = req.body;

  if (!datos.email || !datos.password) {
    return res.json({
      statusCode: 404,
      message: "Faltan datos por enviar",
    });
  }

  try {
    // Buscamos en la base de datos si existe el email y el usuario
    const user = await UsuariosModel.findOne({ email: datos.email });
    //.select("-password"); // me saca la password del user para que no se vea

    if (!user) {
      return res.json({ statusCode: 404, message: "No existe el usuario" });
    }

    //comprobar las password
    const pwd = bcrypt.compareSync(datos.password, user.password);

    if (!pwd) {
      return res.json({
        statusCode: 400,
        message: "No te has identificando correctamente",
      });
    }

    // conseguir el token
    const token = createToken(user);

    return res.json({
      statusCode: 200,
      message: "Te has identificado correctamente",
      user: {
        id: user._id,
        name: user.name,
        nick: user.nick,
      },
      token,
    });
  } catch (error) {
    return res.json({ statusCode: 500, message: "Error del servidor", error });
  }
});

userRouter.get("/profile/:id", authenticate, async (req, res) => {
  // Recibir el parametro del id de usuario por la url
  const id = req.params.id;
  try {
    // consulta para sacar los datos del usuario
    const userProfile = await UsuariosModel.findById(id).select(
      "-password -role"
    );
    if (!userProfile) {
      return res.json({
        statusCode: 404,
        message: "El usuario no existe o hay un error",
      });
    }

    //info de seguimineto        id del usario identificado   id del usuario del perfil
    const followInfo = await followThisUser(req.user.id, id)
    
    // Devolver el resultado
    return res.json({
      statusCode: 200,
      user: userProfile,
      following:  followInfo.following, // Sigo usuario
      follower: followInfo.followers  // me siguen usuarios
    });

  } catch (error) {
    return res.json({
      statusCode: 400,
      message: "Error al sacar los datos del usuario",
      error,
    });
  }
});

userRouter.get("/listado/:page?", authenticate, async (req, res) => {
  try {
    let page = req.params.page || 1; // Página por defecto
    const itemsPerPage = 5;
    // Convertir la página a un número entero
    page = parseInt(page, 10);

    // Consultar usuarios paginados con métodos nativos de Mongoose
    const users = await UsuariosModel.find() // Encuentra todos los documentos en la colección UsuariosModel
      .select("-password -role -email -__v")
      .sort("_id") // Ordena los documentos por el campo "_id" en orden ascendente
      .skip((page - 1) * itemsPerPage) // Omite los primeros documentos según la página actual
      .limit(itemsPerPage); // Limita el número de documentos devueltos por página

    // Contar el total de usuarios
    const total = await UsuariosModel.countDocuments();

    // Información de seguimiento del usuario autenticado
    const followInfo = await followUsersIds(req.user.id);

    // Devolver la respuesta con los usuarios y metadatos de paginación
    return res.json({
      statusCode: 200,
      message: "Ruta de listado de Usuarios",
      users,
      page,
      itemsPerPage,
      total,
      pages: Math.ceil(total / itemsPerPage),
      following: followInfo.following, // Sigo usuario
      followers: followInfo.followers  // me siguen usuarios
    });
  } catch (error) {
    return res.status(400).json({
      statusCode: 400,
      error: error.message, // Enviar el mensaje de error específico si hay un error
    });
  }
});

userRouter.put("/update", authenticate, async (req, res) => {
  try {
    const usersIdentificado = req.user; // persona que está logeada
    const usersUpDate = req.body; // datos que vienen del formulario a modificar
    // Eliminar campos sobrantes
    delete usersUpDate.iat;
    delete usersUpDate.exp;
    delete usersUpDate.role;
    // Validar entrada
    if (usersUpDate.email) {
      usersUpDate.email = usersUpDate.email.toLowerCase();
    }
    if (usersUpDate.nick) {
      usersUpDate.nick = usersUpDate.nick.toLowerCase();
    }
    // Comprobar si el usuario ya existe con el nuevo email o nick, excluyendo al usuario actual
    const existingUser = await UsuariosModel.findOne({
      $or: [
        { email: usersUpDate.email },
        { nick: usersUpDate.nick },
      ], 
    });
    // Verifica si el email ya está registrado por otro usuario
    if (existingUser && existingUser.email === usersUpDate.email) {
      return res.status(400).json({
        statusCode: 400,
        message: "El correo electrónico ya está registrado. Por favor, utiliza otro correo.",
      });
    }
    // Verifica si el nick ya está en uso por otro usuario
    if (existingUser && existingUser.nick === usersUpDate.nick) {
      return res.status(400).json({
        statusCode: 400,
        message: "El nick ya está en uso. Por favor, elige otro nick.",
      });
    }
    // Cifrar la contraseña si se está actualizando
    if (usersUpDate.password) {
      usersUpDate.password = await bcrypt.hash(usersUpDate.password, 10);
    } else {
      delete usersUpDate.password; // No actualizar la contraseña si no está presente
    }


    // Actualizar el usuario en la base de datos
    const updatedUser = await UsuariosModel.findByIdAndUpdate(usersIdentificado.id, usersUpDate, { new: true });

    return res.json({
      statusCode: 200,
      message: "Usuario actualizado correctamente",
      user: updatedUser 
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: 500,
      message: "Error al actualizar el usuario",
      error: error.message,
    });
  }
});

userRouter.post('/upload', [authenticate, uploads.single("file0")], async (req, res) => {
  try {
    // Recoger el fichero de imagen y comprobar que existen 
    if (!req.file) {
      return res.status(404).json({
        statusCode: 404,
        message: "Petición no incluye la imagen"
      });
    }

    // Conseguir el nombre del archivo
    let image = req.file.originalname;

    // Sacar la extensión del archivo
    const imageSplit = image.split(".");
    const extension = imageSplit[imageSplit.length - 1].toLowerCase();

    // Comprobar extensión
    if (extension !== 'png' && extension !== 'jpg' && extension !== 'jpeg' && extension !== 'gif') {
      // Borrar archivo subido 
      const filePath = req.file.path;
      fs.unlink(filePath, (err) => {
        if (err) {
          return res.status(500).json({
            statusCode: 500,
            message: "Error al borrar el archivo",
          });
        }
      });

      // Devolver respuesta negativa
      return res.status(400).json({
        statusCode: 400,
        message: "Extensión del fichero inválido"
      });
    }

    // Si es correcto, guardamos la imagen en la base de datos 
    const usersUpDate = await UsuariosModel.findByIdAndUpdate(
      req.user.id,
      { image: req.file.filename },
      { new: true }
    );

    if (!usersUpDate) {
      return res.status(500).json({
        statusCode: 500,
        message: "Error en la subida del avatar"
      });
    }

    return res.status(200).json({
      statusCode: 200,
      message: "Subida de imagen exitosa",
      user: usersUpDate,
      file: req.file,
    });

  } catch (error) {
    return res.status(500).json({
      statusCode: 500,
      message: "Error al subir la imagen",
      error: error.message
    });
  }
});

userRouter.get('/avatar/:file', async(req,res) => {
  try {
    // sacar el parametro de la url 
    const file = req.params.file
    //montar el path real de la imagen
    const filePath = "./uploads/avatar/"+file;
    //comprobar que existe
    fs.stat(filePath, (error , exist)=> {
      if(!exist){
        return res.json({
          statusCode: 404,
          message: "No existe la imagen "
        })
      }

      //devolver el file
      return res.sendFile(path.resolve(filePath))
    })
    
  } catch (error) {
    return error
  }
})

userRouter.get('/counters/:id', authenticate, async (req, res) => {
  try {
    let userId = req.user.id;

    if (req.params.id) {
      userId = req.params.id;
    }

    const following = await FollowedModel.countDocuments({ 'user': userId }); // Sigo
    
    const followed = await FollowedModel.countDocuments({ 'followed': userId }); // Me siguen
    
    const publication = await PublicacionModel.countDocuments({ 'user': userId }); // Publicaciones
    
    return res.json({
      statusCode: 200,
      userId,
      following: following,
      followed: followed,
      publication: publication
    });

  } catch (error) {
    console.error("Error fetching counters:", error);
    return res.status(500).json({
      statusCode: 500,
      message: "Error en los contadores",
      error: error.message
    });
  }
});



export default userRouter;
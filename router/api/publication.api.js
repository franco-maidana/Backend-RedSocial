import { Router } from "express";
import PublicacionModel from "../../models/publication.models.js";
import authenticate from "../../middlewares/auth.js";
import multer from "multer";
import fs from 'fs';
import path from "path";
import { followThisUser, followUsersIds } from '../../services/followUsersId.js'

// Configuracion de subida de imagenes
const storage = multer.diskStorage({
  destination: (req, file , cb) => {
    cb(null, "./uploads/publication/")
  },

  filename: (req, file , cb)=> {
    cb(null, 'Publication' + Date.now() + '_' + file.originalname)
  },
})

const uploads = multer({storage})

const publicationRouter = Router()

publicationRouter.get("/publication", async(req,res) => {
  try {
    return res.json({
      statusCode: 200,
      mesagge: "Esto esta de pruba para probar las rutas de publication "
    })
  } catch (error) {
    throw error
  }
})
// guardar publicacion
publicationRouter.post('/save', authenticate, async (req, res) => {
  try {
    // Agarramos los datos de body
    const params = req.body; // lo que viene del formulario
    // Si no me llegan, dar respuesta negativa
    if (!params.text) {
      return res.status(400).json({ statusCode: 400, message: "Debes de enviar el texto de la publicación" });
    }
    // Crear y rellenar el objeto del modelo 
    let newPublication = new PublicacionModel(params);
    newPublication.user = req.user.id;
    // Guardar a la base de datos
    const publicacion = await newPublication.save();
    // Verificar si se guardó correctamente
    if (!publicacion) {
      return res.status(400).json({
        statusCode: 400,
        message: "No se ha guardado la publicación"
      });
    }
    // Devolver respuesta
    return res.status(200).json({
      statusCode: 200,
      message: 'Publicación guardada',
      publicacion
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: 500,
      message: "Error del servidor",
      error: error.message
    });
  }
});
// sacar una publicacion
publicationRouter.get('/detalle/:id', authenticate ,async(req,res)=>{
  try {
    // Sacar id de la publicacion del url 
    const publicationid = req.params.id
    // Find con la condicion del id
    const publicationStorage = await PublicacionModel.findById(publicationid)
    if(!publicationStorage){
      return res.json({
        statusCode: 404,
        mesagge: "No existe la publicacion"
      })
    }
    // Devolver respuesta
    return res.json({
      statusCode: 200,
      mesagge: "Exito al mostrar una publicacion",
      publication: publicationStorage
    })
  } catch (error) {
    return res.status(500).json({
      statusCode: 500,
      message: "Error del servidor",
      error: error.message
    });
  }
})
// Eliminar una publicacion
publicationRouter.delete('/remove/:id', authenticate, async (req, res) => {
  try {
    // Sacar el id de la publicacion a eliminar
    const publicacionId = req.params.id;
    // Find y luego remove
    const result = await PublicacionModel.deleteOne({ user: req.user.id, _id: publicacionId });
    if (!result) {
      return res.status(404).json({
        statusCode: 404,
        message: 'No se ha podido eliminar la publicación o no existe'
      });
    }
    // Devolver respuesta
    return res.status(200).json({
      statusCode: 200,
      message: "Publicación eliminada con éxito",
      result
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: 500,
      message: "Error del servidor",
      error: error.message
    });
  }
});
// Listar todas las publicaciones
publicationRouter.get('/userPublication/:id/:page?', authenticate, async (req, res) => {
  try {
    // Sacar el id del usuario
    const userId = req.params.id;
    // Controlar la página
    let page = req.params.page ? parseInt(req.params.page, 10) : 1;
    const itemsPerPage = 5;
    // Find, populate, ordenar, paginar
    const publicaciones = await PublicacionModel.find({ user: userId })
      .sort('-create_at')
      .populate("user", '-password -__v -role -email')
      .skip((page - 1) * itemsPerPage)
      .limit(itemsPerPage);
    // Contar el total de publicaciones
    const total = await PublicacionModel.countDocuments({ user: userId });
    // Devolver respuesta
    return res.status(200).json({
      statusCode: 200,
      message: "Publicaciones del perfil de un usuario",
      user: req.user,
      publicaciones,
      page,
      totalPublication: total,
      pages: Math.ceil(total / itemsPerPage)
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: 500,
      message: "Error del servidor",
      error: error.message
    });
  }
});
// subir ficheros
publicationRouter.post('/upload/:id', [authenticate, uploads.single("file0")], async (req, res) => {
  try {
    // sacar publicacion id 
    const publicationid = req.params.id
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
    const publicationUpDate = await PublicacionModel.findByIdAndUpdate(
      {"user": req.user.id, "_id": publicationid },
      { file: req.file.filename },
      { new: true }
    );

    if (!publicationUpDate) {
      return res.status(500).json({
        statusCode: 500,
        message: "Error en la subida del avatar"
      });
    }

    return res.status(200).json({
      statusCode: 200,
      message: "Subida de imagen exitosa",
      publication: publicationUpDate,
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

// devolver archivos multimedias (imagenes)
publicationRouter.get('/media/:file', async(req,res)=> {
  try {
    // sacar el parametro de la url 
    const file = req.params.file
    //montar el path real de la imagen
    const filePath = "./uploads/publication/"+file;
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
    return res.status(500).json({
      statusCode: 500,
      message: "Error del servidor",
      error: error.message
    });
  }
})

// Listar todas las publicaciones (Feed)
publicationRouter.get('/feed/:page?', authenticate, async (req, res) => {
  try {
    // Sacar la página actual
    let page = req.params.page ? parseInt(req.params.page, 10) : 1;

    // Establecer número de elementos por página
    const itemsPerPage = 5;

    // Sacar un array de identificadores de usuarios que yo sigo como usuario logeado
    const myFollows = await followUsersIds(req.user.id);

    // Find a publicación con operador in, ordenar y paginar
    const publicaciones = await PublicacionModel.find({
      user: { $in: myFollows.following }
    })
      .sort('-create_at')
      .populate("user", '-password -__v -role -email')
      .skip((page - 1) * itemsPerPage)
      .limit(itemsPerPage);

    // Contar el total de publicaciones
    const total = await PublicacionModel.countDocuments({
      user: { $in: myFollows.following }
    });

    // Devolver respuesta
    return res.status(200).json({
      statusCode: 200,
      message: "Feed de publicaciones",
      user: {
        ...req.user,
        publicaciones,
        following: myFollows.following
      },
      page,
      itemsPerPage,
      total,
      pages: Math.ceil(total / itemsPerPage)
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: 500,
      message: "Error del servidor",
      error: error.message
    });
  }
});






export default publicationRouter
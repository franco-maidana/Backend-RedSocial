import { Router } from "express";
import FollowedModel from "../../models/follow.model.js";
import UsuariosModel from "../../models/user.models.js";
import authenticate from "../../middlewares/auth.js";
import {followThisUser , followUsersIds } from "../../services/followUsersId.js"

const followRouter = Router()

followRouter.get("/follow", async(req,res) => {
  try {
    return res.json({
      statusCode: 200 ,
      message: "Estamos probando la ruta de follw"
    })
  } catch (error) {
    throw error
  }
})

// Accion de seguir a una persona 
followRouter.post('/save', authenticate  ,async(req,res)=> {
  try {
    // Conseguir datos del body 
    const params = req.body
    // sacar el id del usuario identificado
    const identity = req.user
    // crear objeto con modelo follow
    const userToFollow = new FollowedModel({
      user: identity.id,
      followed: params.followed
    })
    // Guardar objeto a la base de datos
    const followStored = await userToFollow.save();
    return res.json({
      statusCode: 200,
      identity: req.user,
      follow: followStored,
    });

  } catch (error) {
    return error
  }
})

// Acción para eliminar un seguidor
followRouter.delete('/delete/:id', authenticate, async (req, res) => {
  try {
    // Buscamos el id del usuario identificado 
    const userId = req.user.id;
    // Agarramos el id del usuario que sigo y quiero dejar de seguir
    const followedId = req.params.id;
    // Encontrar coincidencias y eliminar
    const followStored = await FollowedModel.deleteOne({
      "user": userId,
      "followed": followedId
    });
    return res.json({
      statusCode: 200,
      identity: req.user,
      followStored
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: 500,
      message: "Error al intentar dejar de seguir al usuario",
      error: error.message,
    });
  }
});

// Accion de listado de usuarios que estoy siguiendo a un usuario
followRouter.get("/seguidos/:id?/:page?", authenticate, async (req, res) => {
  try {
    let userId = req.user.id; // Usuario autenticado
    if (req.params.id) userId = req.params.id; // comprobar si me llega el id por parametro en url 
    let page = 1;
    if (req.params.page) page = parseInt(req.params.page, 10);
    const usuariosPorPage = 5;
    // Paginación
    const follows = await FollowedModel.find({ user: userId }).populate("user followed", "-password -role -__v -email").skip((page - 1) * usuariosPorPage).limit(usuariosPorPage);
    // Obtener el número total de usuarios seguidos
    const totalFollows = await FollowedModel.countDocuments({ user: userId });
    let usuariosFollowIds  = await followUsersIds(req.user.id)
    return res.json({
      statusCode: 200,
      message: "Usuarios a los que sigo!!",
      userLogeado: userId,
      follows,
      totalFollows,
      totalPages: Math.ceil(totalFollows / usuariosPorPage),
      currentPage: page,
      usuariosFollowIds: usuariosFollowIds
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: 500,
      message: "Error al obtener los usuarios seguidos",
      error: error.message
    });
  }
});

// Accion de listado de usuarios que me siguiendo
followRouter.get("/seguidores/:id?/:page?", authenticate, async(req,res)=>{
  try {
    let userId = req.user.id; // Usuario autenticado
    console.log(userId)
    if (req.params.id) userId = req.params.id; // comprobar si me llega el id por parametro en url 
    let page = 1;
    if (req.params.page) page = parseInt(req.params.page, 10);
    const usuariosPorPage = 5;
    // Paginación                          usuario seguido
    const follows = await FollowedModel.find({ followed: userId }).populate("user", "-password -role -__v -email").skip((page - 1) * usuariosPorPage).limit(usuariosPorPage);
    // Obtener el número total de usuarios seguidos
    const totalFollows = await FollowedModel.countDocuments({ user: userId });
    console.log(totalFollows)
    let usuariosFollowIds  = await followUsersIds(req.user.id)
    return res.json({
      statusCode: 200,
      message: "Usuarios que me siguen!!",
      userLogeado: userId,
      follows,
      totalFollows,
      totalPages: Math.ceil(totalFollows / usuariosPorPage),
      currentPage: page,
      usuariosFollowIds: usuariosFollowIds
    });
  } catch (error) {
    return res.json({
      statusCode: 500,
      message: "Error al intentar buscar seguidores",
    });
  }
})




export default followRouter
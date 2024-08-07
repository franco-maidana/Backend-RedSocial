import FollowedModel from "../models/follow.model.js";

const followUsersIds = async (identityUserId) => {
  try {
    // Sacar información de seguimiento
    let following = await FollowedModel.find({ user: identityUserId })
                                        .select({ _id: 0, __v: 0, user: 0 })
                                        .exec();

    let followers = await FollowedModel.find({ followed: identityUserId })
                                        .select({ _id: 0, __v: 0, followed: 0 })
                                        .exec(); 

    // Procesar array de identificadores
    let followingClean = following.map(follow => follow.followed);
    let followersClean = followers.map(follow => follow.user);

    return {
      following: followingClean,
      followers: followersClean
    };
  } catch (error) {
    return {};
  }
};


const followThisUser = async (identityUserId, profileUserId) => {
  try {
    // Sacar información de seguimiento
    let following = await FollowedModel.findOne({ user: identityUserId, followed: profileUserId })

    let followers = await FollowedModel.findOne({ user: profileUserId, followed: identityUserId })

    return {
      following,
      followers
    };
  } catch (error) {
    // Manejo de errores
    console.error('Error al obtener la información de seguimiento:', error);
    return {
      following: null,
      followers: null
    };
  }
};


export { followThisUser, followUsersIds };

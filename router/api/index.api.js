import {Router} from "express";
import userRouter from "./user.api.js";
import publicationRouter from "./publication.api.js";
import followRouter from "./follow.api.js";

const apiRouter = Router()

apiRouter.use("/users", userRouter)
apiRouter.use("/publication", publicationRouter)
apiRouter.use("/follow", followRouter)

export default apiRouter
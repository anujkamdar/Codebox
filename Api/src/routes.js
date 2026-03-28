import {Router} from "express"
import { submitCode } from "./controllers.js";



const routes = Router();
routes.route("/submit").post(submitCode);

export default routes;

import { model, Schema } from "mongoose";


const collection = "users";
const schema = new Schema({
  name: {type: String , required: true},
  nick: {type: String , required: true},
  biografia: {type: String},
  email:{type: String , required: true, unique: true},
  password: {type: String , required: true},
  role:{type: String , default: 'users' },
  image: {type: String, default: "https://i.postimg.cc/wTgNFWhR/profile.png" },
  created_at: { type: Date, default: Date.now },
},
{ timestamps: true }
)

const UsuariosModel = model(collection, schema)
export default UsuariosModel
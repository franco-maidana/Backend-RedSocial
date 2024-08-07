import { model, Schema } from "mongoose";
import mongoosePaginate from 'mongoose-paginate-v2';

const collection = 'publication';
const schema = new Schema({
  user: { type: Schema.ObjectId, ref: 'users' },
  text: { type: String, required: true },
  create_at: { type: Date, default: Date.now },
  file: String,
});

schema.plugin(mongoosePaginate);

const PublicacionModel = model(collection, schema);
export default PublicacionModel;

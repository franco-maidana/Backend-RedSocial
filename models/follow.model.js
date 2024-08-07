import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

const collection = 'follow';
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.ObjectId, ref: "users" },
  followed: { type: mongoose.Schema.ObjectId, ref: "users" },
  created_at: { type: Date, default: Date.now },
});

// Apply the mongoosePaginate plugin to the schema
schema.plugin(mongoosePaginate);

const FollowedModel = mongoose.model(collection, schema);

export default FollowedModel;

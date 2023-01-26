import mongoose, {ObjectId} from "mongoose";
import Capitalize from "mongoose";

import { Database } from "../mongoose";

export * as Database from "../mongoose";

const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;

const BlogPost = new Schema({
  author: ObjectId,
  title: String,
  body: String,
  date: Date
});

const Comment = new Schema({
    name: { type: String, default: 'hahaha' },
    age: { type: Number, min: 18, index: true },
    bio: { type: String, match: /[a-z]/ },
    date: { type: Date, default: Date.now },
    buff: Buffer
  });
  
  // a setter
  Comment.path('name').set(function () {
    return 'Capitalize(v)';
  });
  
  // middleware
  Comment.pre('save', function (next) {
    notify(this.get('email'));
    next();
  });

function notify(arg0: any) {
    throw new Error("Function not implemented.");
}

export default Database
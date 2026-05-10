import mongoose from 'mongoose';
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken"

const postSchema = new mongoose.Schema (
  {
    contect: {
      type: String,
      required: true,
    },
    image: {
      type: String,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    bio: {
      type: String,
    },
    posts: [
      {
        type: mongoose.Schema.Types.ObjectId
      }
    ],
    password: {
      type: String,
      required: true
    },
  },
  {
    timestamps: true,
  }
);

export const Post = mongoose.model("Post", postSchema)
import { Request, Response } from "express";
import { ApiError } from "../utils/ApiError.js";
import {
  uploadToCloudinary,
  uploadVideoToCloudinary,
  removeFromCloudinary,
} from "../utils/cloudinary.js";
import { User } from "../models/user.model.js";
import { Post } from "../models/post.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
// import sanitizeHtml from "sanitize-html";
// import mongoose from "mongoose";
// import { io } from "../index.js";
// import { redisClient } from "../config/redis.js";

export const createPost = async (req: Request, res: Response) => {
  try {
    // let imageLocalPath;
    // let createdPost;
    // if (req.file?.path) {
    //   imageLocalPath = req.file.path;
    //   image = await uploadToCloudinary(imageLocalPath);
    // }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    if (files["image"] && files["video"]) {
      throw new ApiError(
        400,
        "You can upload either an image or a video, not both"
      );
    }

    let image;
    let videoHlsUrl: string | undefined;
    let videoUrl: string | undefined;

    if (files["image"]?.[0]?.path) {
      image = await uploadToCloudinary(files["image"][0].path);
    }

    let videoResult;

    if (files["video"]?.[0]?.path) {
      videoResult = await uploadVideoToCloudinary(files["video"][0].path);
      console.log(
        "Full Cloudinary video result:",
        JSON.stringify(videoResult, null, 2)
      );
      console.log("Eager array:", videoResult?.eager);
      if (!videoResult) {
        throw new ApiError(500, "Failed to upload video to cloudinary");
      }
      // videoHlsUrl =
      //   videoResult.eager?.[0]?.secure_url ?? videoResult.secure_url;

      videoUrl = videoResult.playback_url ?? videoResult.secure_url;
    }

    const { content } = req.body;
    const userId = req.user?._id;

    // Sanitize HTML from TipTap
    const cleanContent = sanitizeHtml(content, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
      allowedAttributes: {
        a: ["href", "target", "rel"],
        img: ["src", "alt"],
        span: ["style"],
      },
      allowedStyles: {
        "*": {
          "font-size": [/^\d+(px|em|rem)$/],
        },
      },
    });

    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, "user not found");
    }

    const createdPost = await Post.create({
      content: cleanContent,
      owner: userId,
      ...(image && {
        image: {
          url: image.secure_url,
          public_id: image.public_id,
        },
      }),
      ...(videoUrl && {
        video: {
          url: videoUrl,
          public_id: videoResult?.public_id,
        },
      }),
    });

    // if (image === undefined) {
    //   createdPost = await Post.create({
    //     content: cleanContent,
    //     owner: userId,
    //   });
    // } else {
    //   createdPost = await Post.create({
    //     content: cleanContent,
    //     image: image.url,
    //     owner: userId,
    //   });
    // }

    const populatedPost = await Post.findById(createdPost._id)
      .populate("owner", "username profileImage")
      .lean();

    if (!populatedPost) {
      throw new ApiError(500, "failed to populate post");
    }

    const formattedPost = {
      ...populatedPost,
      likes: [],
      likeCount: 0,
      commentsCount: 0,
      comments: [],
    };

    // io.emit("new_post", formattedPost);

    // await redisClient.del("home:posts");
    // await redisClient.del(`user:posts:${user.username}`);

    return res
      .status(201)
      .json(new ApiResponse(201, formattedPost, "post creted successfully"));
  } catch (error: unknown) {
    console.error("Error: ", error);

    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        errors: error.errors,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      errors: [],
    });
  }
};

export const getAllPostsForHome = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
    }

    const cacheKey = "home:posts";

    // const cachedData = await redisClient.get(cacheKey);

    // if (cachedData) {
    //   return res
    //     .status(200)
    //     .json(
    //       new ApiResponse(
    //         200,
    //         JSON.parse(cachedData),
    //         "posts fetched from cache"
    //       )
    //     );
    // }

    const posts = await Post.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "owner",
          foreignField: "_id",
          as: "owner",
        },
      },
      {
        $unwind: {
          path: "$owner",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          "owner.password": 0,
          "owner.refreshToken": 0,
          "owner.__v": 0,
        },
      },
      {
        $lookup: {
          from: "comments",
          localField: "comments",
          foreignField: "_id",
          as: "comments",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "comments.commentedBy",
          foreignField: "_id",
          as: "commentUsers",
        },
      },
      {
        $addFields: {
          comments: {
            $map: {
              input: "$comments",
              as: "comment",
              in: {
                _id: "$$comment._id",
                comment: "$$comment.comment",
                createdAt: "$$comment.createdAt",
                commentedBy: {
                  $let: {
                    vars: {
                      user: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: "$commentUsers",
                              as: "user",
                              cond: {
                                $eq: ["$$user._id", "$$comment.commentedBy"],
                              },
                            },
                          },
                          0,
                        ],
                      },
                    },
                    in: {
                      _id: "$$user._id",
                      username: "$$user.username",
                      profileImage: "$$user.profileImage",
                    },
                  },
                },
              },
            },
          },
        },
      },

      //ONLY NEW PART (LIKES)
      {
        $addFields: {
          commentsCount: { $size: "$comments" },
          likeCount: { $size: "$likes" },
        },
      },

      {
        $project: {
          commentUsers: 0,
          __v: 0,
          // keep likes if frontend needs it
          // remove this line if you want full likes array
          // likes: 1
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ]);

    // console.log(posts);

    await redisClient.set(cacheKey, JSON.stringify(posts), {
      EX: 60,
    });

    return res
      .status(200)
      .json(new ApiResponse(200, posts, "posts fetched successfully"));
  } catch (error: unknown) {
    console.error("Error: ", error);

    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        errors: error.errors,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      errors: [],
    });
  }
};
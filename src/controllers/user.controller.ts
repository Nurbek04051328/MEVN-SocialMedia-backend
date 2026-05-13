import { Request, Response } from "express";
import { ApiError } from "../utils/ApiError";
import { uploadToCloudinary } from "../utils/cloudinary";
import { ApiResponse } from "../utils/ApiResponse";
import { User } from "../models/user.model";

export const registerUser =async (req: Request, res: Response) => {
  try {
    let profileImageLocalPath;
    let profileImageUrl;
    if (req.file?.path) {
      profileImageLocalPath = req.file.path;
      const cloudinaryResult = await uploadToCloudinary(profileImageLocalPath);
      if (cloudinaryResult?.url) {
        profileImageUrl = cloudinaryResult.url
      }
    }
    
    const { username, email, password } = req.body;
    if (!username || username === ""){
      throw new ApiError(400, "Username is required");
    } 
    if (!email || email === "") {
      throw new ApiError(400, "Email is required");
    }
    if (!email.includes("@")) {
      throw new ApiError(400, "Invalid email");
    }
    if (!password || password === "") {
      throw new ApiError(400, "Password is required");
    }
    let existingUser = await User.findOne({
      $or: [{ username }, { email }],
    });
    if (existingUser) {
      throw new ApiError(409, "User with this email or username already exist");
    }

    let user;
    if (profileImageUrl) {
      user = await User.create({
        username,
        email,
        password,
        profileImage: profileImageUrl,
      });
    } else {
      user = await User.create({
        username,
        email,
        password,
      });
    }

    const createdUser = await User.findOne({
      $or: [{ username }, { email }],
    });

    if (!createdUser) {
      throw new ApiError(500, "Something went wrong while creating the user");
    }

    const accessToken = createdUser.generateAccessToken();
    const refreshToken = createdUser.generateRefreshToken();

    createdUser.refreshToken = refreshToken;
    await createdUser.save({ validateBeforeSave: false });

    const loggedInUser = await User.findById(createdUser._id).select(
      "-password -refreshToken"
    );

    const cookiesOptions = {
      httpOnly: true,
      secure: false,
    };

    return res
      .status(201)
      .cookie("accessToken", accessToken, cookiesOptions)
      .cookie("refreshToken", refreshToken, cookiesOptions)
      .json(
        new ApiResponse(
          201,
          {
            success: true,
            user: loggedInUser,
            accessToken,
            refreshToken,
          },
          "User registered successfully"
        )
      );

  } catch (error: unknown) {
    if(error instanceof ApiError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        errors: error.errors,
      });
    };

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      errors: []
    })
  }
}

// feat: user registration with profileimage upload and integrate cloudinary
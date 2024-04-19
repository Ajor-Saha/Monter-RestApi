import { OTP } from "../models/otp.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import nodemailer from "nodemailer";

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating refresh and access token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if ([email, password].some((field) => field?.trim() === "")) {
    throw new ApiError(401, "All fields are required");
  }

  const existedUser = await User.findOne({
    $or: [{ email }],
  });

  if (existedUser) {
    throw new ApiError(401, "User with email or username already exists");
  }
  //console.log(req.files);

  const user = await User.create({
    email,
    password,
  });

  // Generate OTP (for demo, just using a simple random number)
  const otp = Math.floor(1000 + Math.random() * 9000);

  // Save OTP to database
  await OTP.create({
    email,
    otp,
  });

  // Send OTP to user's email
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Verification OTP",
    text: `Your OTP is: ${otp}`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error(error);
      throw new ApiError(401, "Failed to send OTP");
    }
    console.log("Email sent: " + info.response);
    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          {},
          `OTP sent to your ${email}. Verify your account.`
        )
      );
  });
});

const verifyOTP = asyncHandler(async (req, res) => {
  const { email, otp, location, age, workDetails } = req.body;

  const otpRecord = await OTP.findOne({ email }).sort({ createdAt: -1 });

  if (!otpRecord || otpRecord.otp !== otp) {
    throw new ApiError(401, "Invalid OTP");
  }

  await User.findOneAndUpdate({ email }, { isVerified: true });

  if (location || age || workDetails) {
    await User.findOneAndUpdate(
      { email },
      { location, age, workDetails },
      { new: true }
    );
  }

  await OTP.deleteOne({ _id: otpRecord._id });

  return res
    .status(201)
    .json(new ApiResponse(201, {}, "Account validated successfully"));
});


const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email) {
    throw new ApiError(401, "email is required");
  }

  const user = await User.findOne({email});

  if (!user) {
    throw new ApiError(401, "User does not exist");
  }

  

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  if (!user.isVerified) {
    throw new ApiError(401, "Verification is required to login to your account")
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(201)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        201,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged In Successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1, // this removes the field from document
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(201)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(201, {}, "User logged out"));
});

const resendOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email || email.trim() === "") {
    throw new ApiError(401, "Email is required");
  }

  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(401, "User not found");
  }

  // Generate new OTP
  const otp = Math.floor(1000 + Math.random() * 9000);

  // Update OTP in the database
  await OTP.findOneAndUpdate({ email }, { otp });

  // Send OTP to user's email
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Verification OTP",
    text: `Your new OTP is: ${otp}`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error(error);
      throw new ApiError(401, "Failed to send OTP");
    }
    console.log("Email sent: " + info.response);
    return res.status(201).json(new ApiResponse(201, {}, `New OTP sent to your ${email}`));
  });
});


export { registerUser, verifyOTP, loginUser, logoutUser, resendOTP };

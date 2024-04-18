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
    .json(new ApiResponse(201, {}, `OTP sent to your ${email}. Verify your account.`))
  });
  
});

const verifyOTP = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;
  
    const otpRecord = await OTP.findOne({ email }).sort({ createdAt: -1 });
  
    
    if (!otpRecord || otpRecord.otp !== otp) {
      throw new ApiError(400, "Invalid OTP");
    }
  
    
    await User.findOneAndUpdate({ email }, { isVerified: true });
  
    
    await OTP.deleteOne({ _id: otpRecord._id });
  
    return res
    .status(201)
    .json(new ApiResponse(201, {}, "OTP verified successfully"))
  });
  


export {
    registerUser,
    verifyOTP,
}


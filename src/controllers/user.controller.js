import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(401, "Invalid old password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(201)
    .json(new ApiResponse(201, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(201)
    .json(new ApiResponse(201, req.user, "User details fetched successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { location, age, workDetails } = req.body;

  
  if (!(location || age || workDetails)) {
    throw new ApiError(401, "At least one field (location, age, or workDetails) is required");
  }

  const userId = req.user?._id;

  
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        ...(location && { location }), // Update location if provided
        ...(age && { age }), // Update age if provided
        ...(workDetails && { workDetails }), // Update workDetails if provided
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  
  return res
    .status(201)
    .json(new ApiResponse(201, updatedUser, "Account details updated successfully"));
});

export {
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails
};

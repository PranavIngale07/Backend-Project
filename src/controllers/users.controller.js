import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/fileUpload.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";


const generateAccessTokenAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefresToken()

        // if (!accessToken === undefined) {
        //     throw new ApiError(500,"access token error")  
        // }

        // console.log(accessToken)
        user.refreshToken = refreshToken //-> put refresh token in DB
        await user.save({ validateBeforeSave: false }) //-> user save in db ig

        return { accessToken, refreshToken }

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access token and refresh token")
    }
}



const registerUser = asyncHandler(async (req, res) => {
    //steps for registration --> Algorithm
    //1. get user details from frontend
    //2. check for validation - not empty
    //3. check if user already exits : using email and username
    //4. check for any files if they need to be submit and upload them in cloudinary
    //5. create user object - create entry in db
    //6. remove password and refresh token field from response
    //7. check for user creation
    //8. return response


    //get user details
    const { fullName, email, username, password } = req.body
    console.log("email: ", email);

    //validation check for empty
    /*
    if(fullName === "")
    {
         throw new ApiError(400,"FullName is required")
    }*/

    if (
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All field is required")
    }


    //check if user already exits 
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "Username and email already exits")
    }

    // console.log(req.files)
    //check for images/files
    const avatarLocalPath = req.files?.avatar[0]?.path
    console.log(avatarLocalPath);
    // const coverImageLocalPath = req.files?.coverImage[0]?.path

    let coverImageLocalPath; // if cover image is not present
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    //upload files into cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)


    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }

    //create entry in db
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "", //As we havent made coverimage compulsory , thats why we check here if link is present or not to avoid error at DB
        email,
        password,
        username: username.toLowerCase()
    })

    //check for user creation and remove password and refresh token
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering user")
    }

    //return response
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User Registerd Sucessfully")
    )
})


const loginUser = asyncHandler(async (req, res) => {
    //steps
    //1. req body -> data
    // login user using username or email
    //find the user
    // password check
    //access and refresh token
    //send cookies


    // take data from body
    const { email, username, password } = req.body
    console.log(email)

    if (!username && !email) {
        throw new ApiError(400, "username or email is required");
    }

    //find user
    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!user) {
        throw new ApiError(404, "User doesnt exit");
    }

    //password check
    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid Password");
    }

    const { accessToken, refreshToken } = await generateAccessTokenAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser, accessToken, refreshToken
                },
                "User Logged In Successfully"

            )
        )
})


const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }

        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out"))
})


const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
        const user = await User.findById(decodedToken?._id)

        if (!user) {
            throw new ApiError(401, "Invalid refresh Token")
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh Token is expired or used")
        }

        const options = {
            httpOnly: true,
            secure: true
        }
        const { accessToken, newrefreshToken } = await generateAccessTokenAndRefreshToken(user._id)

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newrefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: newrefreshToken },
                    "Access Token refreshed"
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh Token");
    }
})


const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword, confPassword } = req.body

    if (!(newPassword === confPassword)) {
        throw new ApiError(400, "Password Dont match")
    }

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old Password")
    }

    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password changed Successfully"))
})



const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200).json(200, req.user, "Current User fetched successfully")
})

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body

    if (!fullName || !email) {
        throw new ApiError(400, "All fields are required")
    }

    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email
            }
        },
        { new: true }
    ).select("-password")


    return res
    .status(200)
    .json(new ApiResponse(200,{},"Account Details updated successfully"))
})



const updateUserAvatar = asyncHandler(async(req,res)=>{

    const  avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400,"Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(400,"URL Error at  avatar")
    }

    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: 
                {
                    avatar:avatar.url
                }

        },
        { new: true }
    ).select("-password")

    
    return res
    .status(200)
    .json(new ApiResponse(200,{}," updated successfully"))
})



const updateCoverImage = asyncHandler(async(req,res)=>{
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400,"Avatar file is missing")
    }
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(coverImage.url){
        throw new ApiError(400,"URL Error at cover image")
    }

    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: 
                {
                    coverImage:coverImage.url
                }

        },
        { new: true }
    ).select("-password")
})



export { registerUser, loginUser, logoutUser, refreshAccessToken, getCurrentUser, changeCurrentPassword, updateAccountDetails,updateUserAvatar , updateCoverImage}
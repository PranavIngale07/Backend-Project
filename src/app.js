import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser";

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials:true
}))


app.use(express.json({limit: "16kb"})) //when data comes in json format , app should be able to parse it
app.use(express.urlencoded({extended:true,limit: "16kb"})) // when data comes in URL format
app.use(express.static("public"))
app.use(cookieParser())


//routes import

import userRouter from './routes/user.routes.js'



//routes declaration
app.use("/api/v1/users",userRouter) //--> standard professional approach

//when the client goes to "/users" control will be transfered to userRouter and according to the needs the methods in userRouter will be exectued


export { app }
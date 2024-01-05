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


export { app }
import dotenv from "dotenv"
import connectDB from "./db/index.js";
import {app} from "./app.js"


dotenv.config({
    path: "./env"
})

connectDB()
    .then(() => {
        app.on("error", (error) => {
            console.log("ERROR in APP:", error)
            throw error
        })

        app.listen(process.env.PORT || 8000, () => {
            console.log(`server is running at port ${process.env.PORT}`)
        })
    })
    .catch((err) => {
        console.log("Mongo DB failed : ", err);
    })
































/*--------- FIRST APPROACH TO CONNECT DB ------------*/
/*
import express from 'express'
const app = express();


( async ()=>{
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("error" , (error)=>{
            console.log("ERR:",error)
            throw error
        })

        app.listen(process.env.PORT, ()=>{
            console.log(`App is listening on port ${process.env.PORT}`)
        })
         
    } catch (error) {
        console.error("Error: ",error)
        throw error;
    }
})()  //IIFE ,good way to start IIFE with semicolon

*/
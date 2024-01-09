import multer from "multer";


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "./public/temp")
    },
    filename: function (req, file, cb) {

        cb(null, file.originalname) //not a good practice to keep file name same as original , might be the case that many files of same name may come and overwrite
    }
})

export const upload = multer({
    storage,
})



class ApiError extends Error { //This means ApiError inherits properties and methods from the Error class.
    constructor(               //It takes four parameters
        statesCode,
        message = "Something went wrong",
        errors = [],
        statck = ""
    ){
        super(message)
        this.statesCode = statesCode
        this.data = null
        this.message = message
        this.success = false;
        this.errors = errors


        if(statck){
            this.stack = statck
        }else{
            Error.captureStackTrace(this,this.constructor)
        }
    }
}

export {ApiError}
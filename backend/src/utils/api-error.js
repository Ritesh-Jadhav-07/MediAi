class ApiError extends Error{
    constructor(
        statusCode,
        stack = "",
        errors = [],
        message = "Something went wrong!!"

    ){
        super(message);
        this.statusCode = statusCode;
        this.errors = errors;
        this.Success = false;
        this.data = null;

        if(stack){
            this.stack = stack;
        }else{
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

export default ApiError;
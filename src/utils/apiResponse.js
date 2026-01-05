class ApiResponse {
    constructor(statusCode, message, data = null) {
        this.success = statusCode < 400;
        this.statusCode = statusCode;
        this.message = message;
        if (data) {
            this.data = data;
        }
    }

    static success(res, message = 'Success', data = null, statusCode = 200) {
        return res.status(statusCode).json(new ApiResponse(statusCode, message, data));
    }

    static error(res, message = 'Error', statusCode = 500, errors = null) {
        const response = new ApiResponse(statusCode, message);
        if (errors) {
            response.errors = errors;
        }
        return res.status(statusCode).json(response);
    }

    static created(res, message = 'Created successfully', data = null) {
        return this.success(res, message, data, 201);
    }

    static noContent(res) {
        return res.status(204).send();
    }
}

module.exports = ApiResponse;

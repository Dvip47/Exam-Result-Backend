const dashboardService = require('../services/dashboard.service');
const ApiResponse = require('../utils/apiResponse');

class DashboardController {
    async getStats(req, res, next) {
        try {
            const stats = await dashboardService.getStats();
            return ApiResponse.success(res, 'Dashboard statistics retrieved successfully', stats);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new DashboardController();

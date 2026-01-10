require('dotenv').config();
const User = require('../models/user');
const Post = require('../models/post');
const Category = require('../models/category');
const Page = require('../models/page');
const connectDatabase = require('../config/database');
const logger = require('../utils/logger');

/**
 * Seed admin user from environment variables
 */
const seedAdmin = async () => {
    try {
        await connectDatabase();

        const adminEmail = process.env.ADMIN_EMAIL || 'admin@dailyexamresult.com';
        const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';
        const adminName = process.env.ADMIN_NAME || 'Super Admin';

        // Check if admin already exists
        const existingAdmin = await User.findOne({ email: adminEmail });

        if (existingAdmin) {
            logger.info('Admin user already exists');
            console.log('✅ Admin user already exists');
            console.log(`📧 Email: ${adminEmail}`);
            process.exit(0);
        }

        // Create admin user
        const admin = new User({
            name: adminName,
            email: adminEmail,
            password: adminPassword,
            role: 'admin',
            isActive: true,
        });

        await admin.save();

        logger.info('Admin user created successfully');
        console.log('✅ Admin user created successfully');
        console.log(`📧 Email: ${adminEmail}`);
        console.log(`🔑 Password: ${adminPassword}`);
        console.log('\n⚠️  IMPORTANT: Change the password after first login!');

        process.exit(0);
    } catch (error) {
        logger.error('Error seeding admin:', error);
        console.error('❌ Error seeding admin:', error.message);
        process.exit(1);
    }
};

seedAdmin();

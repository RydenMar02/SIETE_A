import 'dotenv/config';
import { Sequelize } from 'sequelize';

const db = new Sequelize(
    process.env.DATABASE,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
        host: process.env.DB_HOST,
        dialect: 'mysql',
        port: process.env.DB_PORT,
        logging: false,
        timezone: '-04:00',
    }
);

export default db;
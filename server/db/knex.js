import knexConfig from '../knexfile.js';
import knex from 'knex';

const env = process.env.NODE_ENV || 'development';
const db = knex(knexConfig[env]);
export default db;

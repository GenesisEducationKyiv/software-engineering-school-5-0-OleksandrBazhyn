import knex from "knex";
import config from "./knexConfig.js";

const db = knex(config);
export default db;

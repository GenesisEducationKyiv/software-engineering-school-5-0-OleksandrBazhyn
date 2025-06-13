import db from "../db/knex.js";
import { describe, it, expect } from "@jest/globals";

describe("Database connection", () => {
  it("should connect to the database and execute a simple query", async () => {
    const result = await db.raw("SELECT 1+1 AS result");
    const value =
      result && "rows" in result && Array.isArray(result.rows)
        ? result.rows[0].result
        : Array.isArray(result) && result.length > 0
          ? result[0].result
          : undefined;
    expect(value).toBe(2);
  });
});

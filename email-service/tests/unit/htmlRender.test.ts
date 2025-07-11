import { HtmlRender } from "../../src/services/htmlRender.js";
import fs from "fs/promises";

jest.mock("fs/promises");

describe("HtmlRender", () => {
  it("renders template with context", async () => {
    (fs.readFile as jest.Mock).mockResolvedValue("Hello, {{name}}!");
    const htmlRender = new HtmlRender();
    const result = await htmlRender.render("test-template", { name: "World" });
    expect(result).toBe("Hello, World!");
    expect(fs.readFile).toHaveBeenCalledWith(
      "public/templates/test-template.html",
      "utf-8",
    );
  });
});

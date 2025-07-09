import { TSArch } from "tsarch";

describe("Architecture", () => {
  it("defines that all files in dog folder should be called ...Dog.ts", async () => {
    const project = await TSArch.parseTypescriptProject("./src");

    const rule = TSArch.defineThat()
      .files()
      .withPathMatching(/.*dog.*/)
      .should()
      .matchName(/.+\.Dog\.ts$/);

    const result = rule.check(project.getSubjects());
    expect(result).toBe(true);
  });
});

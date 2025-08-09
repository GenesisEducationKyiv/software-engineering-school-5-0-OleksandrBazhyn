import fs from "node:fs/promises";
import handlebars, { TemplateDelegate } from "handlebars";

export class HtmlRender {
  private templateCache: Map<string, TemplateDelegate> = new Map();

  async render<T extends object>(templateName: string, context: T): Promise<string> {
    let compiled = this.templateCache.get(templateName);
    if (!compiled) {
      const templatePath = `public/templates/${templateName}.html`;
      const source = await fs.readFile(templatePath, "utf-8");
      compiled = handlebars.compile(source);
      this.templateCache.set(templateName, compiled);
    }
    return compiled(context);
  }
}

export class View {
    constructor() {
        this.loadTemplate = this.loadTemplate.bind(this);
    }

    async loadTemplate(templatePath: string): Promise<string> {
        const response = await fetch(templatePath);
        return await response.text();
    }

    replaceTemplate(template: string, data: Record<string, any>): string {
        let result = template;
        for (const [key, value] of Object.entries(data)) {
            result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
        }
        return result;
    }
}

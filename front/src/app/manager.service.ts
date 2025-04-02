import { Injectable } from '@angular/core';
import { CodeTemplate } from './templates/CodeTemplate';
import { TemplatesService } from './templates.service';
import { Expression } from './matrixes/Expression';
import { ExpressionsService } from './expressions.service';

@Injectable({
  providedIn: 'root'
})
export class ManagerService {
  selectedTemplate: CodeTemplate = new CodeTemplate("", "", "")
  templates: CodeTemplate[] = []
  expressions: Expression[] = []

  constructor(templateService : TemplatesService, expressionService : ExpressionsService) {
    templateService.getTemplates().subscribe((data) => {
      this.templates = data
      this.selectedTemplate = this.templates[0]
    })

    expressionService.getExpressions().subscribe((data) => {
      this.expressions = data
    })
  }

  getTemplatesStartingBy(prefix: string): CodeTemplate[] {
    return this.templates.filter(t => t.fileName.startsWith(prefix))
  }

  getExpressionsStartingBy(name: string): Expression[] {
    return this.expressions.filter(t => t.expressionName.startsWith(name))
  }
  
  
}

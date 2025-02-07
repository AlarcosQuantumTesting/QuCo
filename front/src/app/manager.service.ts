import { Injectable } from '@angular/core';
import { CodeTemplate } from './templates/CodeTemplate';
import { TemplatesService } from './templates.service';

@Injectable({
  providedIn: 'root'
})
export class ManagerService {

  selectedTemplate: CodeTemplate = new CodeTemplate("", "", "")
  templates: CodeTemplate[] = []

  constructor(templateService : TemplatesService) {
    templateService.getTemplates().subscribe((data) => {
      this.templates = data
      this.selectedTemplate = this.templates[0]
    })

  }
}

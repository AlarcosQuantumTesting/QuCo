import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { CodeTemplate } from './templates/CodeTemplate';

@Injectable({
  providedIn: 'root'
})
export class TemplatesService {
  controller : string = "templates"

  constructor(private client : HttpClient) { }

  getTemplates(): Observable<CodeTemplate[]> {
      return this.client.get<CodeTemplate[]>(environment.beUrl + this.controller + "/getTemplates", { responseType : 'json' })
  }

  createTemplate<Template>(selectedTemplate: Template) : Observable<Template> {
    return this.client.post<Template>(environment.beUrl + this.controller + "/createTemplate", selectedTemplate, { responseType : 'json' })
  }

  updateTemplate<Template>(selectedTemplate: Template) {
    return this.client.post<Template>(environment.beUrl + this.controller + "/updateTemplate", selectedTemplate, { responseType : 'json' })
  }
}

import { Injectable } from '@angular/core';
import { CodeTemplate } from './templates/CodeTemplate';

@Injectable({
  providedIn: 'root'
})
export class ManagerService {

  selectedTemplate: CodeTemplate = new CodeTemplate("", "", "")
  templates: CodeTemplate[] = []

  constructor() { }
}

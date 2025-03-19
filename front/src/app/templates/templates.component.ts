import { Component, OnInit } from '@angular/core';
import { TemplatesService } from '../templates.service';
import { CodeTemplate } from './CodeTemplate';
import { ManagerService } from '../manager.service';

@Component({
  selector: 'app-templates',
  templateUrl: './templates.component.html',
  styleUrls: ['../circuit-editor/circuit-editor.component.css']
})
export class TemplatesComponent implements OnInit {

  creatingTemplate: boolean = false;

  constructor(private service : TemplatesService, public manager : ManagerService) { }

  ngOnInit(): void {
    this.service.getTemplates().subscribe(
      data => {
        data.sort((a, b) => a.fileName.localeCompare(b.fileName))
        this.manager.templates = Object.assign(data)
        this.manager.selectedTemplate = this.manager.templates[0]
      },
      error => {
        console.error(error)
      }
    )
  }

  show(template : any) {
    this.manager.selectedTemplate = template
    this.creatingTemplate = false
  }

  create() {
    this.creatingTemplate = true
    this.manager.selectedTemplate = new CodeTemplate("", "", "")
  }

  save() {
    if (this.creatingTemplate) {
      let exists = this.manager.templates.find(t => t.fileName == this.manager.selectedTemplate.fileName)
      if (exists) {
        alert("Template already exists")
        return
      }
      let forgottenTokens = this.manager.selectedTemplate.getForgottenTokens()
      if (forgottenTokens.length > 0) {
        let option = window.confirm("The following tokens are not used in the code: " + forgottenTokens.join(", ") + ". Do you want to continue?")
        if (!option)
          return
      }

      this.service.createTemplate(this.manager.selectedTemplate).subscribe(
        data => {
          this.manager.templates.push(data)
          this.manager.templates.sort((a, b) => a.fileName.localeCompare(b.fileName))
          this.manager.selectedTemplate = data
          this.creatingTemplate = false
        },
        error => {
          console.error(error)
        }
      )
    } else {
      this.service.updateTemplate(this.manager.selectedTemplate).subscribe(
        data => {
          this.manager.selectedTemplate = data
        },
        error => {
          console.error(error)
        }
      )
    }
  }
}

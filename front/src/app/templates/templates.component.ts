import { Component, OnInit } from '@angular/core';
import { TemplatesService } from '../templates.service';
import { CodeTemplate } from './CodeTemplate';
import { ManagerService } from '../manager.service';

@Component({
  selector: 'app-templates',
  templateUrl: './templates.component.html',
  // styleUrls: ['../circuit-editor/circuit-editor.component.css']
  styleUrls: ['./templates.component.css']
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

  mensajeTemporal: string = '';
  searchQuery: string = "";

  onSearchInput() {
    // Aquí normalmente no se hace nada porque el <datalist> ya lo hace
  }

  onTabPress(event: KeyboardEvent) {
    if (event.key === 'Tab') {
      this.selectTemplateIfMatch();
    }
  }

  onFocusInput() {
    
  }

  selectTemplateIfMatch() {
    const match = this.manager.templates.find(t => t.fileName.toLowerCase() === this.searchQuery.toLowerCase());
    if (match) {
      this.manager.selectedTemplate = match;
      console.log('Template seleccionado:', match);
    } 
  }

  clearSearch() {
    this.searchQuery = '';
  }

  searchTemplate() {
    const match = this.manager.templates.find(
      template => template.fileName.toLowerCase() === this.searchQuery.trim().toLowerCase()
    );
  
    if (match) {
      this.manager.selectedTemplate = match;
      console.log('Template seleccionado:', match);
      // Aquí podrías hacer algo más con el template (mostrarlo, navegar, etc.)
    } else {
      console.warn('No se encontró ningún template con ese nombre.');
    }
  }
  
}

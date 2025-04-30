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
  editingTemplate: boolean = false;
  nameTemplate: string = "";
  searchQuery: string = "";
  mensajeTemporal: string = '';
  currentName: string = '';
  descriptionTemplate: string = '';
  currentDescription: string = '';
  codeTemplate: string = '';
  currentCode: string = '';
  mostrarModalCrear : boolean = false;
  mostrarInstrucciones : boolean = false;
  error : string = '';
  isInvalid : boolean = false;

  constructor(private service : TemplatesService, public manager : ManagerService) { }

  ngOnInit(): void {
    this.service.getTemplates().subscribe(
      data => {
        data.sort((a, b) => a.fileName.localeCompare(b.fileName))
        this.manager.templates = Object.assign(data)
        this.manager.selectedTemplate = this.manager.templates[0]
        this.searchQuery = this.manager.selectedTemplate?.fileName?.trim() || "";
        this.searchTemplate();
      },
      error => {
        console.error(error)
      }
    )

    this.validateInputs();
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
      //console.log('Template seleccionado:', match);
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
      /*console.log('Template seleccionado:', match);
      console.log('Nombre del template:', this.nameTemplate);*/
      this.editingTemplate = false;
      // Aquí podrías hacer algo más con el template (mostrarlo, navegar, etc.)
    } else {
      console.warn('No se encontró ningún template con ese nombre.');
    }
  }
  
  editTemplate() {
    this.editingTemplate = true;
    this.nameTemplate = this.manager.selectedTemplate?.fileName?.trim();
    this.descriptionTemplate = this.manager.selectedTemplate?.description?.trim() || '';
    this.codeTemplate = this.manager.selectedTemplate?.code?.trim() || '';
  }

  cancelEdit() {
    this.editingTemplate = false;
    this.nameTemplate = this.manager.selectedTemplate?.fileName?.trim();
    this.descriptionTemplate = this.manager.selectedTemplate?.description?.trim();
    this.codeTemplate = this.manager.selectedTemplate?.code?.trim();
  }

  templateExists(): boolean {
    this.currentName = this.nameTemplate?.trim();
    if (!this.currentName) return false;
  
    const requiredSuffix = '.template.txt';

    if (this.currentName && this.currentName.toLowerCase().endsWith('.')) {
      this.currentName += 'template.txt';
    } else if (!this.currentName.toLowerCase().endsWith(requiredSuffix)) {
      this.currentName += requiredSuffix;
    }
    

    const index = this.manager.templates.findIndex(
      t => t.fileName.trim().toLowerCase() === this.currentName.toLowerCase()
    );
    this.validateInputs();
  
    return index !== -1;
  }

  descriptionInput () {
    this.currentDescription = this.descriptionTemplate?.trim();
    this.validateInputs();
  }

  codeInput () {
    this.currentCode = this.codeTemplate?.trim();
    this.validateInputs();
  }
  

  updateTemplate() {
    this.manager.selectedTemplate.fileName = this.nameTemplate.trim();
    console.log("Descripción del template:", this.manager.selectedTemplate.description);
    console.log("Código del template:", this.manager.selectedTemplate.code);
  }

  createTemplate() {
    //this.manager.selectedTemplate.fileName = this.nameTemplate.trim();
    console.log("Nombre del template:", this.currentName);
    console.log("Descripción del template:", this.currentDescription); 
    console.log("Código del template:", this.currentCode);
  }

  cancelarModal() {
    this.mostrarModalCrear = false;
  }

  createModal() {
    this.mostrarModalCrear = true;
    this.nameTemplate = '';
    this.descriptionTemplate = '';
    this.codeTemplate = '';
  }

  abrirInstucciones() {
    this.mostrarInstrucciones = true;
  }

  validateInputs() {
    if (this.descriptionTemplate === '' || this.nameTemplate.trim() === '' || this.nameTemplate === '' || this.codeTemplate === '') {
      this.error = 'All fields are required';
      this.isInvalid = true;
      return;
    }

    /*if ((this.currentDescription == '' || this.currentName == '' || this.currentCode == '') && this.editingTemplate) {
      this.error = 'All fields are required';
      this.isInvalid = true;
      console.log("Invalido: ", this.isInvalid);
      return;
    }*/

    // Si todo está correcto
    this.error = '';
    this.isInvalid = false;
  }
  
}
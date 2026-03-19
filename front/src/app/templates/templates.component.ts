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
  mostrarModalCrear: boolean = false;
  mostrarInstrucciones: boolean = false;
  error: string = '';
  isInvalid: boolean = false;
  showHelp: boolean = false;


  templateToSave: CodeTemplate = new CodeTemplate("", "", "");

  constructor(private service: TemplatesService, public manager: ManagerService) { }

  ngOnInit(): void {
    this.service.getTemplates().subscribe(
      data => {
        const templates = data.map((t: any) => new CodeTemplate(t.fileName, t.description, t.code));
        templates.sort((a, b) => a.fileName.localeCompare(b.fileName));
        this.manager.templates = templates;
        this.manager.selectedTemplate = this.manager.templates[0]
        this.searchQuery = this.manager.selectedTemplate?.displayName?.trim() || "";
        this.searchTemplate();
      },
      error => {
        console.error(error)
      }
    )

    this.isInvalid = false;

    this.validateInputs();
  }

  show(template: any) {
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
        (data: any) => {
          const newTemplate = new CodeTemplate(data.fileName, data.description, data.code);
          this.manager.templates.push(newTemplate);
          this.manager.templates.sort((a, b) => a.fileName.localeCompare(b.fileName));
          this.manager.selectedTemplate = newTemplate;
          this.creatingTemplate = false;
        },
        error => {
          console.error(error)
        }
      )
    } else {
      this.service.updateTemplate(this.manager.selectedTemplate).subscribe(
        (data: any) => {
          this.manager.selectedTemplate = new CodeTemplate(data.fileName, data.description, data.code);
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
    const match = this.manager.templates.find(t => t.fileName.toLowerCase() === this.searchQuery.toLowerCase() || t.displayName.toLowerCase() === this.searchQuery.toLowerCase());
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
      template => template.fileName.toLowerCase() === this.searchQuery.trim().toLowerCase() || template.displayName.toLowerCase() === this.searchQuery.trim().toLowerCase()
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
    this.templateToSave = new CodeTemplate("", "", "");
  }
  isExistingTemplate: boolean = false;

  onNameChange(value: string) {
    this.nameTemplate = value;
    this.isExistingTemplate = this.templateExists();
    this.isInvalid = this.nameTemplate.trim() === '';
  }

  templateExists(): boolean {
    this.currentName = this.nameTemplate?.trim();
    this.currentDescription = this.descriptionTemplate?.trim();
    this.currentCode = this.codeTemplate?.trim();

    if (!this.currentName) return false;

    const requiredSuffix = '.template.txt';

    if (this.currentName.toLowerCase().endsWith('.template.')) {
      this.currentName += 'txt';
    } else if (this.currentName.toLowerCase().endsWith('.template')) {
      this.currentName += '.txt';
    } else if (this.currentName && this.currentName.toLowerCase().endsWith('.')) {
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

  descriptionInput() {
    this.currentDescription = this.descriptionTemplate?.trim();
    this.validateInputs();
  }

  codeInput() {
    this.currentCode = this.codeTemplate?.trim();
    this.validateInputs();
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
    this.isInvalid = false;
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

  validInputs(): boolean {
    this.isInvalid = false;
    if (this.descriptionTemplate === '' || this.nameTemplate.trim() === '' || this.nameTemplate === '' || this.codeTemplate === '') {
      this.error = 'All fields are required';
      this.isInvalid = true;
      return true;
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
    return false;
  }

  saveTemplate() {

    this.templateToSave.fileName = this.currentName;
    this.templateToSave.description = this.currentDescription;
    this.templateToSave.code = this.currentCode;

    let forgottenTokens = this.templateToSave.getForgottenTokens()
    if (forgottenTokens.length > 0) {
      let option = window.confirm("The following tokens are not used in the code: " + forgottenTokens.join(", ") + ". Do you want to continue?")
      if (!option)
        return
    }

    this.service.createTemplate(this.templateToSave).subscribe(
      (data: any) => {
        this.mensajeTemporal = 'Template created successfully!';
        setTimeout(() => {
          this.mensajeTemporal = '';
        }, 2000);
        this.mostrarModalCrear = false;
        this.mostrarInstrucciones = false;
        const newTemplate = new CodeTemplate(data.fileName, data.description, data.code);
        this.manager.templates.push(newTemplate);
        this.manager.templates.sort((a, b) => a.fileName.localeCompare(b.fileName));
        this.manager.selectedTemplate = newTemplate;
      },
      error => {
        console.error(error);
      }
    );

    console.log("Nombre del template:", this.templateToSave.fileName);
    console.log("Descripción del template:", this.templateToSave.description);
    console.log("Código del template:", this.templateToSave.code);
    /*this.nameTemplate = '';
    this.descriptionTemplate = '';
    this.codeTemplate = '';
    this.currentName = '';
    this.currentDescription = '';
    this.currentCode = '';
    this.creatingTemplate = false;
    this.mensajeTemporal = '';*/
    this.templateToSave = new CodeTemplate("", "", "");
    this.cancelEdit();
  }

  updateTemplate() {
    /*this.templateToSave.fileName = this.currentName;
    this.templateToSave.description = this.currentDescription;
    this.templateToSave.code = this.currentCode;*/


    this.isExistingTemplate = this.templateExists();

    this.manager.selectedTemplate.description = this.currentDescription;
    this.manager.selectedTemplate.code = this.currentCode;

    console.log("Nombre del template sel:", this.manager.selectedTemplate.fileName);
    console.log("Descripción del template sel:", this.manager.selectedTemplate.description);
    console.log("Código del template sel:", this.manager.selectedTemplate.code);


    /*const forgottenTokens = this.manager.selectedTemplate.getForgottenTokens();
    if (forgottenTokens.length > 0) {
      const confirmMsg = `The following tokens are not used in the code: ${forgottenTokens.join(", ")}. Do you want to continue?`;
      const option = window.confirm(confirmMsg);
      if (!option) return;
    }*/



    this.service.updateTemplate(this.manager.selectedTemplate).subscribe(
      (data: any) => {
        /*console.log("Nombre del template:", this.templateToSave.fileName);
        console.log("Descripción del template:", this.templateToSave.description);
        console.log("Código del template:", this.templateToSave.code);*/
        console.log("Respuesta del backend:", data);
        if (!data || !data.fileName) {
          console.error("Error: respuesta inválida del backend", data);
          return;
        }

        const index = this.manager.templates
          .filter(t => t && t.fileName)
          .findIndex(t => t.fileName === data.fileName);

        const updatedTemplate = new CodeTemplate(data.fileName, data.description, data.code);

        if (index === -1) {
          this.manager.templates.push(updatedTemplate);
        } else {
          this.manager.templates[index] = updatedTemplate;
        }

        this.manager.templates.sort((a, b) => a.fileName.localeCompare(b.fileName));
        this.manager.selectedTemplate = updatedTemplate;
        this.mensajeTemporal = 'Template updated successfully!';
        setTimeout(() => {
          this.mensajeTemporal = '';
        }, 2000);

        this.cancelEdit();
      },
      (error) => {
        console.error("Error updating template:", error);
      }
    );

  }

  toggleHelp() {
    this.showHelp = !this.showHelp;
  }
}
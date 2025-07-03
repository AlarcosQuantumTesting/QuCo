import { Component } from '@angular/core';
import { QubitsConfiguration } from './QubitConfiguration';
import { QubitsConfigurationService } from '../qubits-configuration.service';

@Component({
  selector: 'app-qubits-configuration',
  templateUrl: './qubits-configuration.component.html',
  styleUrls: ['./qubits-configuration.component.css']
})
export class QubitsConfigurationComponent {
  selectedQubitsConfigurationName : string | null = null
  existingConfigurationNames : string[] = []
  qubitsConfiguration : QubitsConfiguration = new QubitsConfiguration();
  error? : any

  mensajeTemporal: string = '';
  searchQuery: string = "";
  isConfigSelected: boolean = false;

  constructor(private qubitsConfigurationService: QubitsConfigurationService) { 
    this.error = undefined
    this.qubitsConfigurationService.getQubitConfigurationNames().subscribe(
      qubitsConfigurations => {
        this.existingConfigurationNames = qubitsConfigurations
      },
      error => {
        this.error = error.error.message
      })
  }

  randomize() {
    if (this.qubitsConfiguration.name.length>0) 
      this.qubitsConfiguration.randomize()
  }    

  onQubitsConfigurationChange(cfgName : string) {
    this.qubitsConfigurationService.getQubitsConfiguration(cfgName).subscribe(
      qubitsConfiguration => {
        this.qubitsConfiguration = new QubitsConfiguration()
        this.qubitsConfiguration.name = qubitsConfiguration.name
        this.qubitsConfiguration.matrix = qubitsConfiguration.matrix
        this.qubitsConfiguration.qubits = qubitsConfiguration.qubits    
      },
      error => { 
        this.error = error.error.message
      })
  }

  saveQubitsConf() {
    this.qubitsConfigurationService.saveQubitsConfiguration(this.qubitsConfiguration).subscribe(
      qubitsConfiguration => {
        alert("Configuration saved")
      }, 
      error => { 
        this.error = error.error.message
      })
  }

  // Mover X en la matriz
  moveX(row: number, col: number) {
    this.qubitsConfiguration.moveX(row, col);
  }

  isConflict(colIndex: number): boolean {
    const columnOccurrences = this.qubitsConfiguration.matrix.filter(value => value === colIndex).length;
    return columnOccurrences > 1;
  }

  isConflictMatrix(): boolean {
  const counts: Record<number, number> = {};
  for (const colIndex of this.qubitsConfiguration.matrix) {
    if (colIndex != null) {
      counts[colIndex] = (counts[colIndex] || 0) + 1;
      if (counts[colIndex] > 1) {
        return true;
      }
    }
  }
  return false;
}

  onSearchInput() {
    // Aquí normalmente no se hace nada porque el <datalist> ya lo hace
  }

  onTabPress(event: KeyboardEvent) {
    if (event.key === 'Tab') {
      this.selectConfigIfMatch();
    }
  }

  onFocusInput() {
    
  }

  selectConfigIfMatch() {

    this.qubitsConfigurationService.getQubitConfigurationNames().subscribe(
      (configNames: string[]) => {
        const match = configNames.find(
          (configName: string) => configName.toLowerCase() === this.qubitsConfiguration.name.trim().toLowerCase()
        );
        if (match) {
          this.selectedQubitsConfigurationName = match;
          this.qubitsConfigurationService.getQubitsConfiguration(match).subscribe(
            qubitsConfiguration => {
              this.qubitsConfiguration = new QubitsConfiguration();
              this.qubitsConfiguration.name = qubitsConfiguration.name;
              this.qubitsConfiguration.matrix = qubitsConfiguration.matrix;
              this.qubitsConfiguration.qubits = qubitsConfiguration.qubits;
            },
            error => {
              this.error = error.error.message;
            }
          );
          //console.log('Template seleccionado:', match);
        } 
      },
      error => {
        this.error = error.error.message;
      }
    );
  }

  clearSearch() {
    this.searchQuery = '';
  }

  searchConfig() {
    this.qubitsConfigurationService.getQubitConfigurationNames().subscribe(
      (configNames: string[]) => {
        const match = configNames.find(
          (configName: string) => configName.toLowerCase() === this.searchQuery.trim().toLowerCase()
        );
        if (match) {
          
          this.selectedQubitsConfigurationName = match;
          this.qubitsConfigurationService.getQubitsConfiguration(match).subscribe(
            qubitsConfiguration => {
              this.qubitsConfiguration = new QubitsConfiguration();
              this.qubitsConfiguration.name = qubitsConfiguration.name;
              this.qubitsConfiguration.matrix = qubitsConfiguration.matrix;
              this.qubitsConfiguration.qubits = qubitsConfiguration.qubits;
            },
            error => {
              this.error = error.error.message;
            }
          );
          this.isConfigSelected = true;
          //console.log('Template encontrado:', match);
        } else {
          console.warn('No confiurations found for:', this.searchQuery);
        }
      },
      error => {
        this.error = error.error.message;
      }
    );
  }

  editConfiguration() {
    this.editingConfig = true;
  }

  editingConfig: boolean = false;
  nameConfig: string = "";
  qubisConfig: number = 1;
  qubitsConfigTable!: QubitsConfiguration;
  isExistingConfig: boolean = false;
  isInvalid: boolean = false;

  cancelEdit() {
      this.editingConfig = false;
      if (this.isConfigSelected) {
        this.searchConfig();
      }
      this.nameConfig = this.qubitsConfiguration.name?.trim();
      this.qubisConfig = this.qubitsConfiguration.qubits;
      // this.qubitsConfigTable = this.qubitsConfiguration.?.trim();
      // this.templateToSave = new CodeTemplate("", "", "");
    }

    onNameChange(value: string) {
    this.nameConfig = value;
    this.isExistingConfig = this.configExists();
    this.isInvalid = this.nameConfig.trim() === '';
  }

  configExists(): boolean {
    return this.existingConfigurationNames.some(name => name.toLowerCase() === this.qubitsConfiguration.name.trim().toLowerCase());
  }

  validInputs(): boolean {
    return this.nameConfig.trim() !== '' && this.qubitsConfiguration.qubits > 0;
  }

  updateConfig() {
    if (this.validInputs()) {
      this.qubitsConfiguration.name = this.nameConfig.trim();
      this.qubitsConfiguration.qubits = this.qubisConfig;
      this.qubitsConfigurationService.saveQubitsConfiguration(this.qubitsConfiguration).subscribe(
        qubitsConfiguration => {
          this.mensajeTemporal = "Configuration updated successfully";
          setTimeout(() => {
            this.mensajeTemporal = '';
          }, 3000);
          this.editingConfig = false;
          this.isConfigSelected = true;
        }, 
        error => { 
          this.error = error.error.message;
        }
      );
    } else {
      alert("Invalid inputs. Please check the configuration name and number of qubits.");
    }
  }

  newConfig() {
    this.qubitsConfiguration = new QubitsConfiguration();
    this.isConfigSelected = false;
    this.editingConfig = true;
    this.nameConfig = '';
    this.qubisConfig = 1;
    this.qubitsConfiguration.qubits = 6;
    this.isExistingConfig = false;
    this.isInvalid = false;
    this.searchQuery = '';
  }

  canEdit(): boolean {
  return this.editingConfig || !this.isConfigSelected;
  }


}

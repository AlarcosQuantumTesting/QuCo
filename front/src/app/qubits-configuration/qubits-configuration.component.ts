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
}

import { Component } from '@angular/core';
import { StoragesService } from '../storages.service';
import { QubitsConfiguration } from './QubitConfiguration';

@Component({
  selector: 'app-qubits-configuration',
  templateUrl: './qubits-configuration.component.html',
  styleUrls: ['./qubits-configuration.component.css']
})
export class QubitsConfigurationComponent {

  qubitsConfiguration?  : QubitsConfiguration | null;

  constructor(public storages: StoragesService) {
  }

  onQubitsConfigurationChange() {
    if (this.qubitsConfiguration)
      this.qubitsConfiguration = this.storages.openQubitsConfiguration(this.qubitsConfiguration);
  }

  // Mover X en la matriz
  moveX(row: number, col: number) {
    this.storages.qubitsConfiguration.moveX(row, col);
  }

  isConflict(colIndex: number): boolean {
    const columnOccurrences = this.storages.qubitsConfiguration.matrix.filter(value => value === colIndex).length;
    return columnOccurrences > 1;
  }
}

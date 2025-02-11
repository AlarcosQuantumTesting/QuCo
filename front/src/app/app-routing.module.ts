import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MatrixesComponent } from './matrixes/matrixes.component';
import { BlocksComponent } from './blocks/blocks.component';
import { ElongingComponent } from './elonging/elonging.component';
import { GroverComponent } from './grover/grover.component';
import { DeterministicComponent } from './deterministic/deterministic.component';
import { QuantumEditorComponent } from './quantum-editor/quantum-editor.component';
import { TemplatesComponent } from './templates/templates.component';
import { QubitsConfigurationComponent } from './qubits-configuration/qubits-configuration.component';

const routes: Routes = [
  { path : "matrix", component : MatrixesComponent },
  { path : "grover", component : GroverComponent },
  { path : "elonging", component : ElongingComponent },
  { path : "blocks", component : BlocksComponent },
  { path : "grenoble", component : DeterministicComponent },
  { path : "editor", component : QuantumEditorComponent },
  { path : "templates", component : TemplatesComponent },
  { path : "qubits-configuration", component : QubitsConfigurationComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

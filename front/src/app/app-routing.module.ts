import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MatrixesComponent } from './matrixes/matrixes.component';
import { BlocksComponent } from './blocks/blocks.component';
import { ElongingComponent } from './elonging/elonging.component';
import { GroverComponent } from './grover/grover.component';
import { DeterministicComponent } from './deterministic/deterministic.component';
import { CircuitEditorComponent } from './circuit-editor/circuit-editor.component';
import { TemplatesComponent } from './templates/templates.component';
import { QubitsConfigurationComponent } from './qubits-configuration/qubits-configuration.component';
import { HomeComponent } from './home/home.component';

const routes: Routes = [
  // { path: "", redirectTo: "/matrix", pathMatch: "full" }, // Redirect empty path to 'matrix'
  { path: "matrix", component: MatrixesComponent },
  { path: "grover", component: GroverComponent },
  { path: "elonging", component: ElongingComponent },
  { path: "blocks", component: BlocksComponent },
  { path: "grenoble", component: DeterministicComponent },
  { path: "editor", component: CircuitEditorComponent },
  { path: "templates", component: TemplatesComponent },
  { path: "qubits-configuration", component: QubitsConfigurationComponent },
  { path: "home", component: HomeComponent },
  //{ path: '**', redirectTo: 'home' }
  { path: "", redirectTo: "/home", pathMatch: "full" }
];


@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

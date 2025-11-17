import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http'

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { MatrixesComponent } from './matrixes/matrixes.component';
import { RouterModule, Routes } from '@angular/router';
import { BlocksComponent } from './blocks/blocks.component';
import { ElongingComponent } from './elonging/elonging.component';
import { DeterministicComponent } from './deterministic/deterministic.component';
import { CircuitEditorComponent } from './circuit-editor/circuit-editor.component';
import { TemplatesComponent } from './templates/templates.component';
import { QubitsConfigurationComponent } from './qubits-configuration/qubits-configuration.component';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { EditorComponent } from './editor/editor.component';
import { HomeComponent } from './home/home.component';
import { TranspilationComponent } from './transpilation/transpilation.component';
import { ModalDescargaComponent } from './modal-descarga/modal-descarga.component';
import { RunCodeComponent } from "./run-code/run-code.component";
import { NotesModalComponent } from "./notes-modal/notes-modal.component";

const appRoutes : Routes = [
  { path : 'matrixes', component : MatrixesComponent },
  { path : 'elonging', component : ElongingComponent },
  { path : 'blocks', component : BlocksComponent },
  { path : 'home', component : HomeComponent },
  // { path : 'quco', component : AppComponent }
  { path : '', redirectTo : '/', pathMatch : 'full'}
]

@NgModule({
  declarations: [
    AppComponent,
    MatrixesComponent,
    BlocksComponent,
    ElongingComponent,
    DeterministicComponent,
    CircuitEditorComponent,
    TemplatesComponent,
    QubitsConfigurationComponent,
    EditorComponent,
    HomeComponent,
    TranspilationComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    HttpClientModule,
    DragDropModule,
    RouterModule.forRoot(appRoutes),
    ModalDescargaComponent,
    RunCodeComponent,
    NotesModalComponent
],
  providers: [ ],
  bootstrap: [AppComponent]
})
export class AppModule { }

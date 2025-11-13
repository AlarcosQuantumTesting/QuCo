import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule, NgFor, NgIf, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop';

interface ProjectNote {
  text: string;
  timestamp: Date;
}

@Component({
  selector: 'app-notes-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, NgFor, NgIf, DatePipe, CdkDrag, CdkDragHandle],
  templateUrl: './notes-modal.component.html',
  styleUrl: './notes-modal.component.scss'
})

export class NotesModalComponent implements OnInit {
  @Input() mostrarModal: boolean = false;
  @Output() cerrarModal = new EventEmitter<void>();

  @Input() contextIdentifier: any;
  
  notes: ProjectNote[] = [];
  currentNoteText: string = '';
  private storageKey: string = 'tool_notes';

  constructor() { }

  ngOnInit(): void {
    this.setStorageKey();
    
    this.loadNotesFromStorage();
  }

  setStorageKey(): void {
    let baseKey = 'project_';

    // 1. Prioridad: Si contextIdentifier es un string válido (ej. this.selectedAlgorithm)
    if (typeof this.contextIdentifier === 'string' && this.contextIdentifier.trim().length > 0) {
      // Normalizamos el string para usarlo como clave
      baseKey += this.contextIdentifier.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    }
    // 2. Segunda prioridad: Si contextIdentifier es la instancia del componente padre
    else if (this.contextIdentifier && this.contextIdentifier.constructor && this.contextIdentifier.constructor.annotations) {
      const componentMetadata = this.contextIdentifier.constructor.annotations.find((annotation: any) => annotation.selector);
      if (componentMetadata && componentMetadata.selector) {
        baseKey += componentMetadata.selector; 
      } else {
        baseKey += this.contextIdentifier.constructor.name || 'unknown_component';
      }
    }
    // 3. Fallback: Si no se pasa nada o es inválido
    else {
      baseKey += 'global_default';
    }

    this.storageKey = `${baseKey}_notes`;
    console.log(`Notas vinculadas: ${this.storageKey}`);
  }

  addNote(): void {
    const text = this.currentNoteText.trim();
    if (text) {
      const newNote: ProjectNote = {
        text: text,
        timestamp: new Date()
      };
      
      this.notes.push(newNote);
      this.currentNoteText = '';
      this.saveNotesToStorage();
    }
  }

  /**
   * Elimina una nota por su índice en la matriz 'notes'.
   * @param notesIndex El índice de la nota a eliminar.
   */
  deleteNote(notesIndex: number): void {
    if (confirm('¿Estás seguro de que quieres eliminar esta nota?')) {
        // Elimina 1 elemento empezando en la posición 'notesIndex'
        this.notes.splice(notesIndex, 1);
        
        // Vuelve a guardar el array actualizado en localStorage
        this.saveNotesToStorage();
    }
  }

  saveNotesToStorage(): void {
    localStorage.setItem(this.storageKey, JSON.stringify(this.notes));
  }

  loadNotesFromStorage(): void {
    const storedNotes = localStorage.getItem(this.storageKey);
    if (storedNotes) {
      this.notes = JSON.parse(storedNotes).map((note: any) => ({
        text: note.text,
        timestamp: new Date(note.timestamp)
      }));
    }
  }
}
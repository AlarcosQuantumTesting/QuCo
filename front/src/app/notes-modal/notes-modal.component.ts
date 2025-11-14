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
  private storageKey: string = 'project_notes';
  editingIndex: number | null = null;
  editedText: string = '';
  showNotesHistory: boolean = false;
  mostrarConfirmDelete: boolean = false;
  noteToDeleteIndex: number | null = null;
  mostrarConfirmDeleteAll: boolean = false;

  constructor() { }

  ngOnInit(): void {
    this.setStorageKey();
    
    this.loadNotesFromStorage();
  }

  setStorageKey(): void {
    let baseKey = 'project_';

    if (typeof this.contextIdentifier === 'string' && this.contextIdentifier.trim().length > 0) {
      baseKey += this.contextIdentifier.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    }
    else if (this.contextIdentifier && this.contextIdentifier.constructor && this.contextIdentifier.constructor.annotations) {
      const componentMetadata = this.contextIdentifier.constructor.annotations.find((annotation: any) => annotation.selector);
      if (componentMetadata && componentMetadata.selector) {
        baseKey += componentMetadata.selector; 
      } else {
        baseKey += this.contextIdentifier.constructor.name || 'unknown_component';
      }
    }
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

      if (!this.showNotesHistory) {
          this.showNotesHistory = true;
      }
    }
  }

  editNote(index: number, currentText: string): void {
    this.editingIndex = index;
    this.editedText = currentText;
  }

  saveEdit(): void {
    if (this.editingIndex !== null) {
      const originalIndex = this.editingIndex;
      const newText = this.editedText.trim();
      
      if (newText.length > 0) {
        this.notes[originalIndex].text = newText;
        this.notes[originalIndex].timestamp = new Date();
        this.saveNotesToStorage();
      }
      
      this.editingIndex = null;
      this.editedText = '';
    }
  }

  cancelEdit(): void {
    this.editingIndex = null;
    this.editedText = '';
  }

  deleteNote(notesIndex: number): void {
    this.noteToDeleteIndex = notesIndex;
    this.mostrarConfirmDelete = true;
  }

  confirmDeleteNote(): void {
    if (this.noteToDeleteIndex !== null) {
      this.notes.splice(this.noteToDeleteIndex, 1);
      this.saveNotesToStorage();
      this.cancelEdit();
    }
    this.cancelDelete();
  }

  cancelDelete(): void {
    this.mostrarConfirmDelete = false;
  }

  deleteAllNotes(): void {
    this.mostrarConfirmDeleteAll = true;
  }

  confirmDeleteAllNotes(): void {
    this.notes = [];
    this.saveNotesToStorage();
    this.cancelEdit();
    this.mostrarConfirmDeleteAll = false;
  }

  cancelDeleteAll(): void {
    this.mostrarConfirmDeleteAll = false;
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
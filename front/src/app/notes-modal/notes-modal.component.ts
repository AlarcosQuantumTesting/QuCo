import { Component, OnInit, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule, NgFor, NgIf, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop';

interface ProjectNote {
  title: string;
  text: string;
  timestamp: Date;
  type: string;
}

@Component({
  selector: 'app-notes-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, NgFor, NgIf, DatePipe, CdkDrag, CdkDragHandle],
  templateUrl: './notes-modal.component.html',
  styleUrl: './notes-modal.component.scss'
})

export class NotesModalComponent implements OnInit, OnChanges {
  @Input() mostrarModal: boolean = false;
  @Output() cerrarModal = new EventEmitter<void>();

  @Input() contextIdentifier: any;

  readonly FIXED_TYPES: string[] = [
    'Genetic', 
    'Blocks', 
    'Matrices', 
    'Editor', 
    'Grover', 
    'Grenoble', 
    'Originalgr'
  ];
  
  allNotes: ProjectNote[] = [];
  notes: ProjectNote[] = [];
  currentNoteText: string = '';
  currentNoteTitle: string = '';
  private storageKey: string = 'project_notes';
  private noteType: string = 'global_default';
  editingIndex: number | null = null;
  editedText: string = '';
  editedTitle: string = '';
  showNotesHistory: boolean = false;
  mostrarConfirmDelete: boolean = false;
  noteToDeleteIndex: number | null = null;
  mostrarConfirmDeleteAll: boolean = false;

  //availableTypes: string[] = [];
  availableTypes: string[] = ['all', ...this.FIXED_TYPES];
  filterType: string = 'all';
  sortOrder: 'newest' | 'oldest' = 'newest';

  constructor() { } 

  ngOnInit(): void {
    this.setNoteType();
    
    this.loadNotesFromStorage();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['mostrarModal']) {
      if (changes['mostrarModal'].currentValue === true) {
        this.setNoteType();
        //this.setStorageKey();
        this.loadNotesFromStorage();
      }
    }
  }

  setNoteType(): void {
    let identifier = 'global_default';

    if (typeof this.contextIdentifier === 'string' && this.contextIdentifier.trim().length > 0) {
      identifier = this.contextIdentifier.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    }

    else if (this.contextIdentifier && this.contextIdentifier.constructor && this.contextIdentifier.constructor.annotations) {
      const componentMetadata = this.contextIdentifier.constructor.annotations.find((annotation: any) => annotation.selector);
      if (componentMetadata && componentMetadata.selector) {
        identifier = componentMetadata.selector; 
      } else {
        identifier = this.contextIdentifier.constructor.name || 'unknown_component';
      }
    }

    //this.noteType = identifier;
    this.noteType = 'quco_' + identifier;
    console.log(`Tipo de nota (identifier) definido: ${this.noteType}`);
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
    const title = this.currentNoteTitle.trim();
    if (text && title) {
      const newNote: ProjectNote = {
        title: title,
        text: text,
        timestamp: new Date(),
        type: this.noteType 
      };
      
      this.allNotes.push(newNote);
      this.currentNoteText = '';
      this.currentNoteTitle = '';
      this.saveNotesToStorage();
      this.applyFiltersAndSort();

      if (!this.showNotesHistory) {
          this.showNotesHistory = true;
      }
    }
  }

  editNote(index: number, currentText: string, currentTitle: string): void {
    this.editingIndex = index;
    this.editedText = currentText;
    this.editedTitle = currentTitle;
  }

  saveEdit(): void {
    if (this.editingIndex !== null) {
      const originalIndex = this.editingIndex;
      const newText = this.editedText.trim();
      const newTitle = this.editedTitle.trim();
      
      /*if (newText.length > 0) {
        this.notes[originalIndex].text = newText;
        this.notes[originalIndex].timestamp = new Date();
        this.saveNotesToStorage();
      }*/

      if (newText.length > 0 && newTitle.length > 0) {
        const editedNote = this.notes[originalIndex];
        const allNotesIndex = this.allNotes.findIndex(n => n === editedNote);

        if (allNotesIndex > -1) {
            
            this.allNotes[allNotesIndex].text = newText;
            this.allNotes[allNotesIndex].title = newTitle;
            this.allNotes[allNotesIndex].timestamp = new Date();
            
            this.notes[originalIndex].text = newText;
            this.notes[originalIndex].title = newTitle;
            this.notes[originalIndex].timestamp = this.allNotes[allNotesIndex].timestamp;
            
            this.saveNotesToStorage();
        }

      }
      
      this.editingIndex = null;
      this.editedText = '';
      this.editedTitle = '';
    }
  }

  cancelEdit(): void {
    this.editingIndex = null;
    this.editedText = '';
    this.editedTitle = '';
  }

  deleteNote(notesIndex: number): void {
    this.noteToDeleteIndex = notesIndex;
    this.mostrarConfirmDelete = true;
  }

  confirmDeleteNote(): void {
    if (this.noteToDeleteIndex !== null) {
      const noteToDel = this.notes[this.noteToDeleteIndex];
      const allNotesIndex = this.allNotes.findIndex(n => n === noteToDel);
      
      if (allNotesIndex > -1) {
          this.allNotes.splice(allNotesIndex, 1);
      }
      
      this.saveNotesToStorage();
      this.cancelEdit();
      this.applyFiltersAndSort();
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
    if (this.filterType === 'all') {
        this.allNotes = [];
    } else {
        this.allNotes = this.allNotes.filter(note => note.type !== this.filterType);
    }

    this.saveNotesToStorage();
    this.cancelEdit();
    this.applyFiltersAndSort();
    this.mostrarConfirmDeleteAll = false;
  }

  cancelDeleteAll(): void {
    this.mostrarConfirmDeleteAll = false;
  }

  updateAvailableTypes(): void {
    //this.availableTypes = ['all', ...new Set(this.allNotes.map(n => n.type))];
    this.availableTypes = ['all', ...this.FIXED_TYPES];
  }

  /*loadNotesFromStorage(): void {
    const storedNotes = localStorage.getItem(this.storageKey);
    
    if (storedNotes) {
      const parsedNotes: ProjectNote[] = JSON.parse(storedNotes).map((note: any) => ({
        title: note.title,
        text: note.text,
        timestamp: new Date(note.timestamp),
        type: note.type || 'global_default' 
      }));

      this.allNotes = parsedNotes;
      this.availableTypes = ['all', ...this.FIXED_TYPES];
      this.updateAvailableTypes();

      this.applyFiltersAndSort();
    } else {
      this.allNotes = [];
      this.notes = [];
      this.availableTypes = ['all', ...this.FIXED_TYPES];
    }
  }*/

  loadNotesFromStorage(): void {
    const storedNotes = localStorage.getItem(this.storageKey);
    
    if (storedNotes) {
      const parsedNotes: ProjectNote[] = JSON.parse(storedNotes).map((note: any) => ({
        title: note.title || '(No title)',
        text: note.text,
        timestamp: new Date(note.timestamp),
        type: note.type || 'global_default' 
      }));
      
      const specificNotes = parsedNotes.filter(note => note.type === this.noteType);

      this.allNotes = specificNotes;
      
      this.availableTypes = ['all', ...this.FIXED_TYPES];
      this.updateAvailableTypes();

      this.applyFiltersAndSort();
    } else {
      this.allNotes = [];
      this.notes = [];
      this.availableTypes = ['all', ...this.FIXED_TYPES];
    }
  }
  
  saveNotesToStorage(): void {
    localStorage.setItem(this.storageKey, JSON.stringify(this.allNotes));
  }


  applyFiltersAndSort(): void {
    let filteredNotes = [...this.allNotes];

    if (this.filterType !== 'all') {
      const normalizedFilter = this.filterType.toLowerCase();
      
      filteredNotes = filteredNotes.filter(note => String(note.type).toLowerCase() === normalizedFilter);
    }
    
    filteredNotes.sort((a, b) => {
      const dateA = (a.timestamp instanceof Date ? a.timestamp : new Date(a.timestamp)).getTime();
      const dateB = (b.timestamp instanceof Date ? b.timestamp : new Date(b.timestamp)).getTime();
      
      if (this.sortOrder === 'newest') {
        return dateB - dateA;
      } else {
        return dateA - dateB;
      }
    });

    this.notes = filteredNotes;
  }
}
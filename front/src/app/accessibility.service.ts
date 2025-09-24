import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AccessibilityService {
  private fontSize = 100;

  toggleHighContrast() {
    document.body.classList.toggle('high-contrast');
  }

  increaseFontSize() {
    this.fontSize += 10;
    document.body.style.fontSize = this.fontSize + '%';
  }

  decreaseFontSize() {
    this.fontSize = Math.max(80, this.fontSize - 10);
    document.body.style.fontSize = this.fontSize + '%';
  }

  resetFontSize() {
    this.fontSize = 100;
    document.body.style.fontSize = '100%';
  }

  toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
  }
}

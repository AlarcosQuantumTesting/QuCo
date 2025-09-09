import { Component, AfterViewInit, ElementRef, Renderer2 } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { AccessibilityService } from './accessibility.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements AfterViewInit {
  title = 'quco - Quantum Code Generation';

  menuAbierto = false;
  mostrarInicio = true;

  constructor(private router: Router, private el: ElementRef, public accessibility: AccessibilityService, private renderer: Renderer2) {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        // this.mostrarInicio = this.router.url === '/quco';
        this.mostrarInicio = this.router.url === '/home';
      }
    });
  }

  ngAfterViewInit() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('show');
        }
      });
    }, {
      threshold: 0.2 // Aparece cuando el 20% del elemento es visible
    });

    const hiddenElements = this.el.nativeElement.querySelectorAll('.fade-in');
    hiddenElements.forEach((el: any) => observer.observe(el));
  }

  onActivate() {
    this.mostrarInicio = false;
  }

  toggleMenu() {
    this.menuAbierto = !this.menuAbierto;
  }

  goToHome() {
    // window.location.href = '/quco';
    window.location.href = '/home';
  }

  /*
  // Para confirmar la recarga de la página
  ngOnInit(): void {
    window.addEventListener('beforeunload', this.confirmExit);
  }

  ngOnDestroy(): void {
    window.removeEventListener('beforeunload', this.confirmExit);
  }

  confirmExit = (event: BeforeUnloadEvent): void => {
    event.preventDefault();
    event.returnValue = '';
  };
  */

  showAccessibility = false;
  darkMode = false;
  highContrast = false;
  userBgColor = '';
  //bgColor = '#ffffff';       // fondo por defecto
  //containerColor = '#f5f5f5'; // contenedor por defecto


  toggleAccessibilityPanel() {
    this.showAccessibility = !this.showAccessibility;
  }

  closeAccessibilityPanel() {
    this.showAccessibility = false;
  }

  toggleDarkMode() {
    this.darkMode = !this.darkMode;
    if (this.darkMode) {
      this.highContrast = false;
      this.setBgColor('#121212');
    } else {
      this.setBgColor('');
    }
  }

  toggleHighContrast() {
    this.highContrast = !this.highContrast;
    if (this.highContrast) {
      this.darkMode = false;
      this.setBgColor('#000000');
    } else {
      this.setBgColor('');
    }
  }

  pickBgColor(event: any) {
    const color = event.target.value;
    this.setBgColor(color);
  }

  setBgColor(event: any) {
    const color = event.target.value;
    this.bgColor = color;
    this.renderer.setStyle(document.body, 'background-color', color);
    this.setTextColor(color, document.body);
  }

  // Cambiar fondo de contenedores principales
  setContainerColor(event: any) {
    const color = event.target.value;
    this.containerColor = color;
    const mainContainers = document.querySelectorAll('.container');
    mainContainers.forEach(el => {
      (el as HTMLElement).style.backgroundColor = color;
      this.setTextColor(color, el as HTMLElement);
    });
  }

  // Ajustar color de texto según brillo del fondo
  private setTextColor(bgColor: string, element: HTMLElement) {
    const c = bgColor.substring(1);
    const rgb = parseInt(c, 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = rgb & 0xff;
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;

    const textColor = brightness > 128 ? '#000000' : '#ffffff';
    this.renderer.setStyle(element, 'color', textColor);
  }





  bgColor = '#ffffff';
  containerColor = '#f5f5f5';
  sidebarColor = '#1e1e1e';

  grayscale = false;

  // Forzar tonos pastel
  private ensurePastel(hex: string): string {
    const c = hex.substring(1);
    const rgb = parseInt(c, 16);
    let r = (rgb >> 16) & 0xff;
    let g = (rgb >> 8) & 0xff;
    let b = rgb & 0xff;

    // Forzar a que los valores estén entre 150 y 255 → tonos claros
    r = Math.max(150, r);
    g = Math.max(150, g);
    b = Math.max(150, b);

    return `rgb(${r}, ${g}, ${b})`;
  }

  setPastelBgColor(event: any) {
    const color = this.ensurePastel(event.target.value);
    this.bgColor = color;
    this.renderer.setStyle(document.body, 'background-color', color);
  }

  setPastelContainerColor(event: any) {
    const color = this.ensurePastel(event.target.value);
    this.containerColor = color;
    document.querySelectorAll('.content').forEach(el => {
      (el as HTMLElement).style.backgroundColor = color;
    });
  }

  setPastelSidebarColor(event: any) {
    const color = this.ensurePastel(event.target.value);
    this.sidebarColor = color;
    document.querySelectorAll('.sidebar').forEach(el => {
      (el as HTMLElement).style.backgroundColor = color;
    });
    /*document.querySelectorAll('h1').forEach(el => {
      (el as HTMLElement).style.backgroundColor = color;
    });*/
  }

  toggleGrayscale() {
    this.grayscale = !this.grayscale;
    if (this.grayscale) {
      this.renderer.setStyle(document.body, 'filter', 'grayscale(100%) brightness(90%)');
    } else {
      this.renderer.removeStyle(document.body, 'filter');
    }
  }

  resetColors() {
    this.bgColor = '#ffffff';
    this.containerColor = '##e7eeed';
    this.sidebarColor = '#008b95';
    this.grayscale = false;

    this.renderer.setStyle(document.body, 'background-color', this.bgColor);
    document.querySelectorAll('.content').forEach(el => {
      (el as HTMLElement).style.backgroundColor = this.containerColor;
    });
    document.querySelectorAll('.sidebar').forEach(el => {
      (el as HTMLElement).style.backgroundColor = this.sidebarColor;
    });
    this.renderer.removeStyle(document.body, 'filter');
  }
}

import { Component, AfterViewInit, ElementRef, Renderer2, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { AccessibilityService } from './accessibility.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements AfterViewInit, OnInit {
  title = 'quco - Quantum Code Generation';

  ngOnInit(): void {
    this.loadSettings();
  }

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

  navigateAndReload(route: string) {
    // Si ya estamos en la ruta, forzamos reload
    if (this.router.url === '/' + route) {
      this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
        this.router.navigate([route]);
        this.navigateAndReload(route);
      });
    } else {
      this.router.navigate([route]);
    }
  }

  showAccessibility = false;
  darkMode = false;
  highContrast = false;
  userBgColor = '';


  toggleAccessibilityPanel() {
    this.showAccessibility = !this.showAccessibility;
  }

  closeAccessibilityPanel() {
    this.showAccessibility = false;
  }

  private saveSettings() {
    const settings = {
      bgColor: this.bgColor,
      containerColor: this.containerColor,
      sidebarColor: this.sidebarColor,
      grayscale: this.grayscale,
      zoomLevel: this.zoomLevel
    };
    localStorage.setItem('settings', JSON.stringify(settings));
  }

  private loadSettings() {
    const data = localStorage.getItem('settings');
    if (data) {
      const settings = JSON.parse(data);

      this.bgColor = settings.bgColor || this.bgColor;
      this.containerColor = settings.containerColor || this.containerColor;
      this.sidebarColor = settings.sidebarColor || this.sidebarColor;
      this.grayscale = settings.grayscale || false;
      this.zoomLevel = settings.zoomLevel || 1;

      // Aplicar estilos guardados
      this.renderer.setStyle(document.body, 'background-color', this.bgColor);

      document.querySelectorAll('.content').forEach(el => {
        (el as HTMLElement).style.backgroundColor = this.containerColor;
      });

      document.querySelectorAll('.sidebar').forEach(el => {
        (el as HTMLElement).style.backgroundColor = this.sidebarColor;
      });

      if (this.grayscale) {
        this.renderer.setStyle(document.body, 'filter', 'grayscale(100%) brightness(90%)');
      }

      this.updateZoom();
    }
  }

  bgColor = '#ffffff';
  containerColor = '#f5f5f5';
  sidebarColor = '#1e1e1e';

  grayscale = false;

  private ensurePastel(hex: string): string {
    const c = hex.substring(1);
    const rgb = parseInt(c, 16);
    let r = (rgb >> 16) & 0xff;
    let g = (rgb >> 8) & 0xff;
    let b = rgb & 0xff;

    r = Math.max(150, r);
    g = Math.max(150, g);
    b = Math.max(150, b);

    return `rgb(${r}, ${g}, ${b})`;
  }

  setPastelBgColor(event: any) {
    const color = this.ensurePastel(event.target.value);
    this.bgColor = color;
    this.renderer.setStyle(document.body, 'background-color', color);
    this.saveSettings();
  }

  setPastelContainerColor(event: any) {
    const color = this.ensurePastel(event.target.value);
    this.containerColor = color;
    document.querySelectorAll('.content').forEach(el => {
      (el as HTMLElement).style.backgroundColor = color;
    });
    this.saveSettings();
  }

  setPastelSidebarColor(event: any) {
    const color = this.ensurePastel(event.target.value);
    this.sidebarColor = color;
    document.querySelectorAll('.sidebar').forEach(el => {
      (el as HTMLElement).style.backgroundColor = color;
    });
    this.saveSettings();
  }

  toggleGrayscale() {
    this.grayscale = !this.grayscale;
    this.renderer.setStyle(document.body, 'transition', 'all 0.5s ease');
    if (this.grayscale) {
      this.renderer.setStyle(document.body, 'filter', 'grayscale(100%) brightness(90%)');
      this.renderer.setStyle(document.body, 'background-color', '#ffffff');
    } else {
      this.renderer.removeStyle(document.body, 'filter');
      this.renderer.setStyle(document.body, 'background-color', this.bgColor);
    }
    this.saveSettings();
  }

  resetColors() {
    this.bgColor = '#ffffff';
    this.containerColor = '#e7eeed00';
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
    this.saveSettings();
  }

    zoomLevel = 1;
    minZoom = 0.8;
    maxZoom = 1.2;
    step = 0.1;

    updateZoom() {
      document.body.style.zoom = this.zoomLevel.toString();
    }

    increaseZoom() {
      if (this.zoomLevel < this.maxZoom) {
        this.zoomLevel += this.step;
        this.updateZoom();
        this.saveSettings();
      }
    }

    decreaseZoom() {
      if (this.zoomLevel > this.minZoom) {
        this.zoomLevel -= this.step;
        this.updateZoom();
        this.saveSettings();
      }
    }

    isMaxZoom(): boolean {
      return this.zoomLevel >= this.maxZoom;
    }

    isMinZoom(): boolean {
      return this.zoomLevel <= this.minZoom;
    }


    resetZoom() {
      this.zoomLevel = 1;
      this.updateZoom();
      this.saveSettings();
    }


  mostrarModalLogin = false;
  emailUsuario: string = '';
  passwordUsuario: string = '';
  errorLogin: string = '';

  toggleLogin() {
    this.mostrarModalLogin = true;
  }

  isLoginDisabled(): boolean {
    return !this.emailUsuario || !this.passwordUsuario;
  }

  iniciarSesion(): void {
    console.log('Intentando iniciar sesión con:', this.emailUsuario);
  }

  cerrarModalLogin(): void {
    this.mostrarModalLogin = false;
    this.emailUsuario = '';
    this.passwordUsuario = '';
    this.errorLogin = '';
  }
}

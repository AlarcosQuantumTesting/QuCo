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

  /*iniciarSesion(): void {
    console.log('Intentando iniciar sesión con:', this.emailUsuario);
  }*/

  cerrarModalLogin(): void {
    this.mostrarModalLogin = false;
    this.emailUsuario = '';
    this.passwordUsuario = '';
    this.errorLogin = '';
  }

  // Para el Registro
  mostrarModalRegistro: boolean = false;
  emailRegistro: string = '';
  passwordRegistro: string = '';
  passwordConfirmacion: string = '';
  errorRegistro: string = '';
  mensajeExito: string = '';
  mostrarMensajeExito: boolean = false;
  passwordMismatchError: string = '';

  abrirRegistro(): void {
    this.cerrarModalLogin();
    this.mostrarModalRegistro = true;
  }

  isRegisterDisabled(): boolean {
      return !this.emailRegistro || 
            !this.passwordRegistro || 
            !this.passwordConfirmacion || 
            (this.passwordRegistro !== this.passwordConfirmacion);
  }

  get passwordMismatchMessage(): string {
    if (this.passwordConfirmacion && this.passwordRegistro !== this.passwordConfirmacion) {
        return "Passwords do not match.";
    }
    return '';
  }

  cerrarModalRegistro(): void {
    this.mostrarModalRegistro = false;
    this.emailRegistro = '';
    this.passwordRegistro = '';
    this.passwordConfirmacion = '';
    this.errorRegistro = '';
  }


  URL_BASE = "http://localhost:80";

  async registrarUsuario(): Promise<boolean> {

    this.errorRegistro = '';
    this.mostrarMensajeExito = false;

    if (this.passwordRegistro !== this.passwordConfirmacion) {
        this.errorRegistro = 'Las contraseñas no coinciden.';
        return false;
    }

      const userData = {
        email: this.emailRegistro,
        pwd: this.passwordRegistro
      };

    let body =  JSON.stringify(userData)
    console.log("Intentando iniciar sesión con:", body);

      try {
          const response = await fetch(`${this.URL_BASE}/users/create`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify(userData)
          });

          if (response.ok) {
              console.log("Usuario registrado con éxito.");
              this.mostrarModalRegistro = false;
              this.mensajeExito = `Registered successfully! You can now log in, ${this.emailRegistro}!`; 
              this.mostrarMensajeExito = true;
              this.limpiarMensajeExito(2000);
              return true;
          } else if (response.status === 409) {
              const error = await response.text();
              throw new Error(`Error de registro: ${error}`);
          } else {
              throw new Error(`Error al registrar. Estado: ${response.status}`);
          }
      } catch (error) {
          console.error("Fallo en la comunicación:", error);
          return false;
      }
  }


  async iniciarSesion(): Promise<string | null> {
    this.errorLogin = '';
    this.mostrarMensajeExito = false;

    const loginData = {
        email: this.emailUsuario,
        pwd: this.passwordUsuario
    };

    try {
        const response = await fetch(`${this.URL_BASE}/users/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(loginData)
        });

        if (response.ok) {
            const token = await response.text(); 
            console.log("Login exitoso. Token recibido:", token);
            localStorage.setItem('userToken', token);
            this.mostrarModalLogin = false;
            this.mensajeExito = `Logged successfully! Welcome, ${this.emailUsuario}!`;
            this.mostrarMensajeExito = true;
            this.limpiarMensajeExito(2000);
            return token;
        } else if (response.status === 403) {
            throw new Error("Credenciales inválidas (email o contraseña incorrectos).");
        } else {
            throw new Error(`Error al iniciar sesión. Estado: ${response.status}`);
        }
    } catch (error) {
        console.error("Fallo en la comunicación o credenciales:", error);
        return null;
    }
  }


  async obtenerEmailUsuario(token: string) {
    try {
        const response = await fetch(`${this.URL_BASE}/tokens/getUser`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token: token })
        });

        if (response.ok) {
            const email = await response.text(); 
            console.log("Email del usuario:", email);
            return email;
        } else {
            throw new Error("Token inválido o expirado.");
        }
    } catch (error) {
        console.error("Error al obtener el usuario:", error);
        return null;
    }
  }

  limpiarMensajeExito(duration: number = 3000): void {
    setTimeout(() => {
        this.mostrarMensajeExito = false;
        this.mensajeExito = '';
    }, duration);
  }


  isLoggedIn(): boolean {
    return !!localStorage.getItem('userToken');
  }

  mostrarModalLogoutConfirmacion: boolean = false;

  cerrarSesion(): void {
    if (this.isLoggedIn()) {
        this.mostrarModalLogoutConfirmacion = true;
    } else {
        console.log("No hay sesión activa para cerrar.");
    }
  }

  confirmarCerrarSesion(): void {
    localStorage.removeItem('userToken');
    console.log("Sesión cerrada.");
    
    this.mostrarModalLogoutConfirmacion = false;
    
    this.mensajeExito = `Logged out successfully! See you soon!`; 
    this.mostrarMensajeExito = true;
    this.limpiarMensajeExito(3000); 

  }

  cerrarModalLogoutConfirmacion(): void {
      this.mostrarModalLogoutConfirmacion = false;
  }

}
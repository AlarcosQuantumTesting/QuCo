import { Component, AfterViewInit, ElementRef } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router'
import { QucoRequestService } from './qucorequest.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements AfterViewInit {
  title = 'quco - Quantum Code Generation';

  menuAbierto = false;
  mostrarInicio = true;

  constructor(private router: Router, private el: ElementRef, private qucoRequestService: QucoRequestService) {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        // this.mostrarInicio = this.router.url === '/quco';
        this.mostrarInicio = this.router.url === '/home';
      }
    });
    this.qucoRequestService.get()
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
}

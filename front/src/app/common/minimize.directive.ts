import { Directive, ElementRef, HostBinding, Renderer2, Inject, Optional, OnDestroy } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { CdkDrag } from '@angular/cdk/drag-drop';

@Directive({
  selector: '[appMinimize]',
  exportAs: 'appMinimize',
  standalone: true
})
export class MinimizeDirective implements OnDestroy {
  private isMinimized = false;
  private isCustomSized = false;
  private originalStyles = new Map<string, string>();
  private modalContainer: HTMLElement | null = null;
  private originalDragPosition = { x: 0, y: 0 };
  private resizeObserver: ResizeObserver | null = null;

  @HostBinding('class.minimized') get minimizedClass() {
    return this.isMinimized;
  }

  constructor(
    private el: ElementRef, 
    private renderer: Renderer2, 
    @Inject(DOCUMENT) private document: Document,
    @Optional() private cdkDrag: CdkDrag
  ) {
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
           if (this.isMinimized && !this.isCustomSized) {
             const styleWidth = this.el.nativeElement.style.width;
             const styleHeight = this.el.nativeElement.style.height;
             
             const w = parseInt(styleWidth);
             const h = parseInt(styleHeight);
             if ((w && Math.abs(w - 400) > 5) || (h && Math.abs(h - 350) > 5)) {
                this.isCustomSized = true;
                this.updateIcon(false); // Make it a minus to allow minimizing again
             }
           }
        }
      });
      this.resizeObserver.observe(this.el.nativeElement);
    }
  }

  ngOnDestroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  toggle(event: Event) {
    event.stopPropagation();
    event.preventDefault();

    this.modalContainer = this.findModalContainer(this.el.nativeElement);

    if (this.isCustomSized) {
      this.isCustomSized = false;
      this.isMinimized = true;
      
      this.renderer.setStyle(this.el.nativeElement, 'width', '400px');
      this.renderer.setStyle(this.el.nativeElement, 'height', '350px');
      this.renderer.setStyle(this.el.nativeElement, 'max-width', 'none');
      this.renderer.setStyle(this.el.nativeElement, 'max-height', 'none');
      
      if (this.cdkDrag) {
        this.cdkDrag.setFreeDragPosition({ x: 0, y: 0 });
      } else {
        this.renderer.setStyle(this.el.nativeElement, 'transform', 'translate3d(0px, 0px, 0px)');
      }
      
      this.updateIcon(true);
      return;
    }

    this.isMinimized = !this.isMinimized;

    if (this.isMinimized) {
      this.minimize();
      this.updateIcon(true);
    } else {
      this.restore();
      this.updateIcon(false);
    }
  }

  private minimize() {
    // Save original dimensions
    this.originalStyles.set('width', this.el.nativeElement.style.width);
    this.originalStyles.set('height', this.el.nativeElement.style.height);
    this.originalStyles.set('max-width', this.el.nativeElement.style.maxWidth);
    this.originalStyles.set('max-height', this.el.nativeElement.style.maxHeight);

    // Save and reset drag position
    if (this.cdkDrag) {
      this.originalDragPosition = this.cdkDrag.getFreeDragPosition();
      this.cdkDrag.setFreeDragPosition({ x: 0, y: 0 });
    } else {
      this.originalStyles.set('transform', this.el.nativeElement.style.transform);
      this.originalStyles.set('transition', this.el.nativeElement.style.transition);
      this.renderer.setStyle(this.el.nativeElement, 'transform', 'translate3d(0px, 0px, 0px)');
      this.renderer.setStyle(this.el.nativeElement, 'transition', 'all 0.3s ease');
    }

    // Set inline dimensions for minimized state
    this.renderer.setStyle(this.el.nativeElement, 'width', '400px');
    this.renderer.setStyle(this.el.nativeElement, 'height', '350px');
    this.renderer.setStyle(this.el.nativeElement, 'max-width', 'none');
    this.renderer.setStyle(this.el.nativeElement, 'max-height', 'none');

    // Make the background overlay transparent and click-through
    if (this.modalContainer) {
       this.renderer.addClass(this.modalContainer, 'overlay-minimized');
    }
  }

  private restore() {
    // Restore the original position
    if (this.cdkDrag) {
      this.cdkDrag.setFreeDragPosition(this.originalDragPosition);
    } else {
      setTimeout(() => {
        if (this.originalStyles.has('transform')) {
          this.renderer.setStyle(this.el.nativeElement, 'transform', this.originalStyles.get('transform')!);
        } else {
          this.renderer.removeStyle(this.el.nativeElement, 'transform');
        }
        if (this.originalStyles.has('transition')) {
          this.renderer.setStyle(this.el.nativeElement, 'transition', this.originalStyles.get('transition')!);
        } else {
          this.renderer.removeStyle(this.el.nativeElement, 'transition');
        }
      });
    }

    // Restore original dimensions
    const w = this.originalStyles.get('width');
    if (w) this.renderer.setStyle(this.el.nativeElement, 'width', w);
    else this.renderer.removeStyle(this.el.nativeElement, 'width');

    const h = this.originalStyles.get('height');
    if (h) this.renderer.setStyle(this.el.nativeElement, 'height', h);
    else this.renderer.removeStyle(this.el.nativeElement, 'height');

    const mw = this.originalStyles.get('max-width');
    if (mw) this.renderer.setStyle(this.el.nativeElement, 'max-width', mw);
    else this.renderer.removeStyle(this.el.nativeElement, 'max-width');

    const mh = this.originalStyles.get('max-height');
    if (mh) this.renderer.setStyle(this.el.nativeElement, 'max-height', mh);
    else this.renderer.removeStyle(this.el.nativeElement, 'max-height');

    // Restore overlay
    if (this.modalContainer) {
       this.renderer.removeClass(this.modalContainer, 'overlay-minimized');
    }
  }

  private updateIcon(minimized: boolean) {
    const icon = this.el.nativeElement.querySelector('.minimize-i');
    if (icon) {
      if (minimized) {
        this.renderer.removeClass(icon, 'fa-minus');
        this.renderer.addClass(icon, 'fa-expand');
        this.renderer.setAttribute(icon, 'title', 'Restore');
      } else {
        this.renderer.removeClass(icon, 'fa-expand');
        this.renderer.addClass(icon, 'fa-minus');
        this.renderer.setAttribute(icon, 'title', 'Minimize');
      }
    }
  }

  private findModalContainer(element: HTMLElement): HTMLElement | null {
    let current: HTMLElement | null = element.parentElement;
    while (current) {
      if (current.classList.contains('modal') || current.classList.contains('help-modal')) {
        return current;
      }
      current = current.parentElement;
    }
    return null;
  }
}

import { Directive, EventEmitter, HostListener, Output } from '@angular/core';

@Directive({ selector: '[longPress]' })
export class LongPressDirective {
  @Output()
    longPress = new EventEmitter();
  private touchTimeout: any;
  

  private rootPage: any;

  constructor() {}

  @HostListener('touchstart') touchstart():void {
    this.touchTimeout = setTimeout(() => {
        this.longPress.emit({});
    }, 400);
  }



  @HostListener('touchend') touchend():void {
      this.touchEnd();
  }
  @HostListener('touchcancel') touchcancel():void {
      this.touchEnd();
  }


  @HostListener('mousedown') mousedown():void {
    this.touchTimeout = setTimeout(() => {
        this.longPress.emit({});
    }, 800);
  }

  @HostListener('mouseup') mouseup():void {
      this.touchEnd();
  }

  private touchEnd():void {
    clearTimeout(this.touchTimeout);
  }
}
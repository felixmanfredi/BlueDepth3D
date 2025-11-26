import { Directive, EventEmitter, HostListener, Output } from '@angular/core';

@Directive({ selector: '[shortPress]' })
export class ShortPressDirective {

  @Output()
    shortPress = new EventEmitter();

    private _timeout: any;
    private _isShort: boolean=false;

    @HostListener('mousedown') onMouseDown( e:any ) {
        this._isShort = true;
        this._timeout = setTimeout(() => {
            this._isShort = false;
        }, 500);
    }

    @HostListener('mouseup') onMouseUp( e:any ) {
        if (this._isShort) {
            this.shortPress.emit( e );
        }
        clearTimeout(this._timeout);
    }

    @HostListener('mouseleave') onMouseLeave() {
        clearTimeout(this._timeout);
    }

}

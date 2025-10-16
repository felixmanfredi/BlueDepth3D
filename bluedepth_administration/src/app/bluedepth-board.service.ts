import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { BlueDepthBoardEnvironment } from './enviroment';

@Injectable({
  providedIn: 'root'
})
export class BluedepthBoardService {

  
    
  
    baseUrl=BlueDepthBoardEnvironment.apiUrl
    constructor(
      private http:HttpClient
    ) { }


    takePicture(takePicture=350, triggerPicture=50, isFlashing=false, rstCounter=false, isLOCKFocus=false, callback:any){
      let headers:HttpHeaders=new HttpHeaders();
      headers = headers.set('Access-Control-Allow-Origin', '*');
      headers = headers.set('Content-Type', 'application/json');


      this.http.post(this.baseUrl+"/api/sony/takepicture",{takePicture: takePicture, triggerPicture: triggerPicture, isFlashing: isFlashing, rstCounter: rstCounter, isLOCKFocus: isLOCKFocus},{headers:headers}).pipe(catchError(
        this.handleError
      
      
      )).subscribe((result:any)=>{
        if(callback)
          callback(result);
      })
    }
  
    private handleError(error: HttpErrorResponse) {
    if (error.status === 0) {
      // A client-side or network error occurred. Handle it accordingly.
      console.error('An error occurred:', error.error);
    } else {
      // The backend returned an unsuccessful response code.
      // The response body may contain clues as to what went wrong.
      console.error(
        `Backend returned code ${error.status}, body was: `, error.error);
    }
    // Return an observable with a user-facing error message.
    return throwError(() => new Error('Something bad happened; please try again later.'));
  }
  
    getSettings(callback:any,callback_error:any){
      this.http.get(this.baseUrl+"/camera/settings").pipe(catchError(callback_error)).subscribe((result:any)=>{
        if(callback)
          callback(result);
      })
    }
}

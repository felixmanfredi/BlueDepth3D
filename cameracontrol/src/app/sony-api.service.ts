import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SonyApiService {


  baseUrl="http://192.168.1.235:45032"
  constructor(
    private http:HttpClient
  ) { }


  setSettings(settings:any,callback:any){
    let headers:HttpHeaders=new HttpHeaders();
    headers = headers.set('Access-Control-Allow-Origin', '*');


    this.http.put(this.baseUrl+"/camera/settings",settings,{headers:headers}).pipe(catchError(
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

  getSettings(callback:any){
    this.http.get(this.baseUrl+"/camera/settings").subscribe((result:any)=>{
      if(callback)
        callback(result);
    })
  }

}

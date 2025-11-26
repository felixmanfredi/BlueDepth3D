import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, isDevMode } from '@angular/core';
import { catchError, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MpeApiService {

  

  baseUrl="http://192.168.1.235:45032"
  constructor(
    private http:HttpClient
  ) { 

    if(isDevMode()) this.baseUrl="";
  
  }


  setSettings(settings:any,callback:any,onerror:any=null){
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
  alert(error.error.message[0]);
  // Return an observable with a user-facing error message.
  return throwError(() => new Error('Something bad happened; please try again later.'));
}

  getSettings(callback:any,callback_error:any){
    this.http.get(this.baseUrl+"/camera/settings").pipe(catchError(callback_error)).subscribe((result:any)=>{
      if(callback)
        callback(result);
    })
  }

   capture(flash:boolean,callback:any,callback_error:any){
    let headers:HttpHeaders=new HttpHeaders();
    headers = headers.set('Content-Type', 'application/json');

      this.http.post(this.baseUrl+"/camera/capture",{flash:flash},{responseType:"text",headers:headers}).pipe(catchError(callback_error)).subscribe((result:any)=>{
        if(callback)
          callback(result);
      })
    }

    trigger_capture(flash:boolean,callback:any,callback_error:any){
    let headers:HttpHeaders=new HttpHeaders();
    headers = headers.set('Content-Type', 'application/json');

      this.http.post(this.baseUrl+"/datasets/trigger_capture",{flash:flash},{responseType:"text",headers:headers}).pipe(catchError(callback_error)).subscribe((result:any)=>{
        if(callback)
          callback(result);
      })
    }

     focus(callback:any,callback_error:any){
    this.http.get(this.baseUrl+"/camera/focus",{responseType:"text"}).pipe(catchError(callback_error)).subscribe((result:any)=>{
      if(callback)
        callback(result);
    })
  }


  startDataset(dataset:any,callback:any,callback_error:any){

    let headers:HttpHeaders=new HttpHeaders();
    headers = headers.set('Access-Control-Allow-Origin', '*');

    this.http.post(this.baseUrl+"/datasets/start",dataset).pipe(catchError(
      this.handleError
    
    
    )).subscribe((result:any)=>{
      if(callback)
        callback(result);
    })

    
  }

  stopDataset(callback:any,callback_error:any){
    this.http.put(this.baseUrl+"/datasets/stop",{}).pipe(catchError(callback_error)).subscribe((result:any)=>{
      callback(result);
    });
  }

  getDatasets(callback:any,callback_error:any){
    this.http.get(this.baseUrl+"/datasets",{}).pipe(catchError(callback_error)).subscribe((result:any)=>{
      callback(result);
    });
  }

  getDatasetInfo(id_dataset:number,callback:any,callback_error:any){
    this.http.get(this.baseUrl+"/datasets/"+id_dataset.toString()+"/info",{}).pipe(catchError(callback_error)).subscribe((result:any)=>{
      callback(result);
    });
  }

   version(callback:any,callback_error:any){
    this.http.get(this.baseUrl+"/version").pipe(catchError(callback_error)).subscribe((result:any)=>{
      if(callback)
        callback(result);
    })
  }

  getPlugins(callback:any,callback_error:any){
    this.http.get(this.baseUrl+"/plugins").pipe(catchError(callback_error)).subscribe((result:any)=>{
      if(callback)
        callback(result);
    })
  }
}

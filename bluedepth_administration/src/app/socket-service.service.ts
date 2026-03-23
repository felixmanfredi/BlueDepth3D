// socket.service.ts
import { EventEmitter, Injectable, isDevMode, Output } from '@angular/core';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';

@Injectable({ providedIn: 'root' })
export class SocketService {

  @Output()
  onReconnect:EventEmitter<any>=new EventEmitter();

  static isConnected=false;

  private socket: Socket;
  base="http://192.168.1.235:45032";
  constructor() {

    console.log("Connecting to socket server at "+this.base);
    this.socket = io(this.base,{path:"/socket",transports: ["websocket", "polling"],timeout:5000}); // Connect to Socket.IO server
    this.socket.on("connect",()=>{
      SocketService.isConnected=true;
      console.log("Connected to socket server");
    });

    this.socket.on("connect_error", (attempt) => {
      this.onReconnect.emit();
    });

     this.socket.on("disconnect",()=>{
      SocketService.isConnected=false;
      console.log("Disconnected from socket server");
     });

    this.socket.connect();
  }

  // Ascoltare messaggi
  listen(eventName: string): Observable<any> {
    return new Observable((subscriber) => {
      this.socket.on(eventName, (data: any) => {
        subscriber.next(data);
      });
    });
  }

  // Method to send message to the server
  sendMessage(message: string): void {
    this.socket.emit('message', message);
  }

  // Observable to receive messages from the server
  onMessage(callback: (message: string) => void): void {
    this.socket.on('message', callback);
  }
}
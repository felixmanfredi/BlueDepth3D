// socket.service.ts
import { Injectable, isDevMode } from '@angular/core';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket: Socket;
  base="http://192.168.1.235:45032";
  constructor() {

    
    this.socket = io(this.base,{path:"/socket",transports: ["websocket", "polling"]}); // Connect to Socket.IO server
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
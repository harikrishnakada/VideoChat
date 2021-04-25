import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Subscription } from 'rxjs';
import { NamedRoom, VideoChatService } from '../services/videochat.service';
import { tap } from 'rxjs/operators';

/*
 The RoomsComponent provides an interface for users to create rooms by entering a roomName through an <input type=’text’> element and a <button> element bound to the onTryAddRoom method of the class.

As users add rooms the list of existing rooms will appear, the name of each existing room will appear along with the number of active participants and the room’s capacity.

The RoomsComponent subscribes to the videoChatService.$roomsUpdated observable. Any time a room is created, RoomsComponent will signal its creation through the observable and the NotificationHub service will be listening. Using SignalR, the NotificationHub echos this message out to all the other connected clients. This mechanism enables the server-side code to provide real-time web functionality to client apps. In this application, the RoomsComponent will automatically update the list of available rooms.

Under the hood, when a user selects a room to join or creates a room, they connect to that room via the twilio-video SDK.

The RoomsComponent expects a room name and an array of LocalTrack objects. These local tracks come from the local camera preview, which provides both an audio and a video track. The LocalTrack objects are published to rooms that a user joins so other participants can subscribe to and receive them.
 */
@Component({
  selector: 'app-rooms',
  templateUrl: './rooms.component.html',
  styleUrls: ['./rooms.component.css']
})
export class RoomsComponent implements OnInit {

  @Output() roomChanged = new EventEmitter<string>();
  @Input() activeRoomName: string;

  roomName: string;
  rooms: NamedRoom[];

  private subscription: Subscription;

  constructor(
    private readonly videoChatService: VideoChatService) { }

  async ngOnInit() {
    await this.updateRooms();
    this.subscription =
      this.videoChatService
        .$roomsUpdated
        .pipe(tap(_ => this.updateRooms()))
        .subscribe();
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  onTryAddRoom() {
    if (this.roomName) {
      this.onAddRoom(this.roomName);
    }
  }

  onAddRoom(roomName: string) {
    this.roomName = null;
    this.roomChanged.emit(roomName);
  }

  onJoinRoom(roomName: string) {
    this.roomChanged.emit(roomName);
  }

  async updateRooms() {
    this.rooms = (await this.videoChatService.getAllRooms()) as NamedRoom[];
  }

}

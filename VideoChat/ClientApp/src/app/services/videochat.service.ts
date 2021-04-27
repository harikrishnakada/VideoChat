import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { HubConnection, HubConnectionBuilder, LogLevel } from '@aspnet/signalr';
import { Observable, ReplaySubject } from 'rxjs';
import { connect, ConnectOptions, LocalTrack, Room } from 'twilio-video';

interface AuthToken {
  token: string;
}

export interface NamedRoom {
  id: string;
  name: string;
  maxParticipants?: number;
  participantCount: number;
}

export type Rooms = NamedRoom[];

/**
Notice that the retrieval of the Twilio JWT is marked private The getAuthToken method is only used within the VideoChatService class for the invocation of connect from the twilio-video module, which is done asynchronously in the joinOrCreateRoom method.
*/
@Injectable({
  providedIn: 'root'
})
export class VideoChatService {
  $roomsUpdated: Observable<Room>;
  private roomBroadcast = new ReplaySubject<Room>();

  notificationHub: HubConnection;

  constructor(private readonly http: HttpClient) {
    this.$roomsUpdated = this.roomBroadcast.asObservable();
  }

  async createHub() {
    const builder =
      new HubConnectionBuilder()
        .configureLogging(LogLevel.Information)
        .withUrl(`${location.origin}/notificationHub`);

    this.notificationHub = builder.build();
    await this.notificationHub.start();
  }

  private async getAuthToken() {
    const auth =
      await this.http
        .get<AuthToken>(`api/video/token`)
        .toPromise();

    return auth.token;
  }

  getAllRooms() {
    return this.http
      .get<Rooms>('api/video/rooms')
      .toPromise();
  }

  getRoom(roomSid) {
    return this.http
      .get<Rooms>('api/video/room/' + roomSid)
      .toPromise();
  }

  async joinOrCreateRoom(name: string, tracks: LocalTrack[]) {
    let room: Room = null;
    try {
      const token = await this.getAuthToken();
      room =
        await connect(
          token, {
            name,
            tracks,
            dominantSpeaker: true
          } as ConnectOptions);
    } catch (error) {
      console.error(`Unable to connect to Room: ${error.message}`);
    } finally {
      if (room) {
        this.roomBroadcast.next(room);
      }
    }

    return room;
  }

  nudge(activeRoom) {
    this.roomBroadcast.next(activeRoom);
  }

}

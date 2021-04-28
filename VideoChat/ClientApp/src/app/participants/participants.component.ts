import { Component, ElementRef, EventEmitter, Input, OnInit, Output, Renderer2, ViewChild } from '@angular/core';
import { Participant, RemoteAudioTrack, RemoteParticipant, RemoteTrack, RemoteTrackPublication, RemoteVideoTrack, Room, Track } from 'twilio-video';
import { VideoChatService } from '../services/videochat.service';

/*
 A ParticipantComponent also extends an EventEmitter and offers its own set of valuable events. Between the room, participant, publication, and track, there is a complete set of events to handle when participants join or leave a room. When participants join, an event fires and provides publication details of their tracks so the application can render their audio and video to the user interface DOM of each client as the tracks become available.

Much like the CameraComponent, the audio and video elements associated with a participant are render targets to the #list element of the DOM. But instead of being local tracks, these are remote tracks published from remote participants.

 * */
@Component({
  selector: 'app-participants',
  templateUrl: './participants.component.html',
  styleUrls: ['./participants.component.css']
})
export class ParticipantsComponent implements OnInit {
  @ViewChild('list', { static: false }) listRef: ElementRef;
  @Output('participantsChanged') participantsChanged = new EventEmitter<boolean>();
  @Output('leaveRoom') leaveRoom = new EventEmitter<boolean>();
  @Input('activeRoom') activeRoom: Room;

  get participantCount() {
    return !!this.participants ? this.participants.size : 0;
  }

  get isAlone() {
    return this.participantCount === 0;
  }

  private participants: Map<Participant.SID, RemoteParticipant>;
  private dominantSpeaker: RemoteParticipant;

  constructor(private readonly renderer: Renderer2, private readonly videoChatService: VideoChatService) { }

  ngOnInit() {
  }

  clear() {
    if (this.participants) {
      this.participants.clear();
    }
  }

  initialize(participants: Map<Participant.SID, RemoteParticipant>) {
    this.participants = participants;
    if (this.participants) {
      this.participants.forEach(participant => this.registerParticipantEvents(participant));
    }
  }

  add(participant: RemoteParticipant) {
    if (this.participants && participant) {
      this.participants.set(participant.sid, participant);
      this.registerParticipantEvents(participant);
    }
  }

  remove(participant: RemoteParticipant) {
    if (this.participants && this.participants.has(participant.sid)) {
      this.participants.delete(participant.sid);
    }
  }

  loudest(participant: RemoteParticipant) {
    this.dominantSpeaker = participant;
  }

  onLeaveRoom() {
    this.leaveRoom.emit(true);
  }

  private registerParticipantEvents(participant: RemoteParticipant) {
    if (participant) {
      participant.tracks.forEach(publication => this.subscribe(publication, participant));
      participant.on('trackPublished', publication => this.subscribe(publication, participant));
      participant.on('trackUnpublished',
        publication => {
          if (publication && publication.track) {
            this.detachRemoteTrack(publication.track);
          }
        });
    }
  }

  private subscribe(publication: RemoteTrackPublication, participant: RemoteParticipant) {
    if (publication && publication.on) {
      publication.on('subscribed', track => {
        this.attachRemoteTrack(track);
        track.on('enabled', t => {
          console.log(t.isEnabled + t.kind + participant.sid);
          const id = `${t.kind}-info-participant-${participant.sid}`;
          let element = document.getElementById(id);
          if (element != null) {
            if ((t as any).kind == 'audio')
              element.innerHTML = `<span class="fa fa-microphone icon-medium"></span>`;
            else if ((t as any).kind == 'video')
              element.innerHTML = `<span class="fa fa-video icon-medium"></span>`;
          } else {
            element = document.createElement('div');
            element.id = id;
            if ((t as any).kind == 'audio') {
              element.innerHTML = `<span class="fa fa-microphone icon-medium"></span> `;
              this.renderer.setStyle(element, 'margin-left', '50px');
            }
            else if ((t as any).kind == 'video') {
              element.innerHTML = `<span class="fa fa-video icon-medium"></span>`;
              this.renderer.setStyle(element, 'margin-left', '20px');
            }
            this.renderer.setStyle(element, 'position', 'absolute');
            this.renderer.setStyle(element, 'margin-top', '-40px');

            this.renderer.appendChild(this.listRef.nativeElement, element);
          }

        })
        track.on('disabled', t => {
          console.log(t.isEnabled + t.kind + participant.sid);
          const id = `${t.kind}-info-participant-${participant.sid}`;
          let element = document.getElementById(id);
          if (element != null) {
            if ((t as any).kind == 'audio')
              element.innerHTML = `<span class="fa fa-microphone-slash icon-medium"></span>`;
            else if ((t as any).kind == 'video')
              element.innerHTML = `<span class="fa fa-video-slash icon-medium"></span>`;
          } else {
            element = document.createElement('div');
            element.id = id;
            if ((t as any).kind == 'audio') {
              element.innerHTML = `<span class="fa fa-microphone-slash icon-medium"></span> `;
              this.renderer.setStyle(element, 'margin-left', '50px');
            }
            else if ((t as any).kind == 'video') {
              element.innerHTML = `<span class="fa fa-video-slash icon-medium"></span>`;
              this.renderer.setStyle(element, 'margin-left', '20px');
            }
            this.renderer.setStyle(element, 'position', 'absolute');
            this.renderer.setStyle(element, 'margin-top', '-40px');

            this.renderer.appendChild(this.listRef.nativeElement, element);
          }
        })
      });
      publication.on('unsubscribed', track => this.detachRemoteTrack(track));
    }
  }

  private attachRemoteTrack(track: RemoteTrack) {
    if (this.isAttachable(track)) {
      const element = track.attach();
      this.renderer.data.id = track.sid;
      this.renderer.setStyle(element, 'width', '95%');
      this.renderer.setStyle(element, 'margin-left', '2.5%');
      if (this.participants.size == 1)
        this.renderer.addClass(element, 'col-12');
      else
        this.renderer.addClass(element, 'col-6');

      this.renderer.appendChild(this.listRef.nativeElement, element);
      this.participantsChanged.emit(true);
    }
  }

  private detachRemoteTrack(track: RemoteTrack) {
    if (this.isDetachable(track)) {
      track.detach().forEach(el => el.remove());
      this.participantsChanged.emit(true);
    }
  }

  private isAttachable(track: RemoteTrack): track is RemoteAudioTrack | RemoteVideoTrack {
    return !!track &&
      ((track as RemoteAudioTrack).attach !== undefined ||
        (track as RemoteVideoTrack).attach !== undefined);
  }

  private isDetachable(track: RemoteTrack): track is RemoteAudioTrack | RemoteVideoTrack {
    return !!track &&
      ((track as RemoteAudioTrack).detach !== undefined ||
        (track as RemoteVideoTrack).detach !== undefined);
  }

}

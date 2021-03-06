import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { CameraComponent } from '../camera/camera.component';
import { DeviceSelectComponent } from './device-select.component';
import { DeviceService } from '../services/device.service';
import { debounceTime, tap } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { LocalVideoTrack, Room } from 'twilio-video';
import { NamedRoom, VideoChatService } from '../services/videochat.service';

/**
 There are a few components in play with the concept of settings. We’ll have a camera component beneath several DeviceSelectComponents objects.

The SettingsComponent object gets all the available devices and binds them to the DeviceSelectComponent objects that it parents. As video input device selections change the local camera component preview is updated to reflect those changes. The deviceService.$devicesUpdated observable fires as system level device availability changes. The list of available devices updates to accordingly.
 */
@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit, OnDestroy {
  private devices: MediaDeviceInfo[] = [];
  private subscription: Subscription;
  private videoDeviceId: string;

  namedRoom: NamedRoom;

  get hasAudioInputOptions(): boolean {
    return this.devices && this.devices.filter(d => d.kind === 'audioinput').length > 0;
  }
  get hasAudioOutputOptions(): boolean {
    return this.devices && this.devices.filter(d => d.kind === 'audiooutput').length > 0;
  }
  get hasVideoInputOptions(): boolean {
    return this.devices && this.devices.filter(d => d.kind === 'videoinput').length > 0;
  }

  @ViewChild('camera', { static: false }) camera: CameraComponent;
  @ViewChild('videoSelect', { static: false }) video: DeviceSelectComponent;

  @Input('isPreviewing') isPreviewing: boolean;
  @Input() activeRoom: Room;
  @Output() settingsChanged = new EventEmitter<MediaDeviceInfo>();

  screenTrack: LocalVideoTrack;
  constructor(private readonly deviceService: DeviceService, private readonly videoChatService: VideoChatService) { }

  ngOnInit() {
    this.subscription =
      this.deviceService
        .$devicesUpdated
        .pipe(debounceTime(350))
        .subscribe(async deviceListPromise => {
          this.devices = await deviceListPromise;
          this.handleDeviceAvailabilityChanges();
        });

    this.subscription =
      this.videoChatService
        .$namedRoomUpdated
        .pipe(tap(room => this.namedRoom = room))
        .subscribe();
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  async onSettingsChanged(deviceInfo: MediaDeviceInfo) {
    if (this.isPreviewing) {
      await this.showPreviewCamera();
    } else {
      this.settingsChanged.emit(deviceInfo);
    }
  }

  async showPreviewCamera() {
    this.isPreviewing = true;

    this.videoDeviceId = this.video.selectedId;
    const videoDevice = this.devices.find(d => d.deviceId === this.video.selectedId);
    await this.camera.initializePreview(videoDevice);

    return this.camera.tracks;
  }

  hidePreviewCamera() {
    this.isPreviewing = false;
    this.camera.finalizePreview();
    return this.devices.find(d => d.deviceId === this.video.selectedId);
  }

  private handleDeviceAvailabilityChanges() {
    if (this.devices && this.devices.length && this.video && this.video.selectedId) {
      let videoDevice = this.devices.find(d => d.deviceId === this.video.selectedId);
      if (!videoDevice) {
        videoDevice = this.devices.find(d => d.kind === 'videoinput');
        if (videoDevice) {
          this.video.selectedId = videoDevice.deviceId;
          this.onSettingsChanged(videoDevice);
        }
      }
    }
  }

  onVideoSettingChanged(event) {
    if (event)
      this.startVideo()
    else
      this.stopVideo();
  }

  stopVideo() {
    if (this.activeRoom)
      this.activeRoom.localParticipant.videoTracks.forEach(track => {
        track.track.disable();
      });
  }

  startVideo() {
    if (this.activeRoom)
      this.activeRoom.localParticipant.videoTracks.forEach(track => {
        track.track.enable();
      });
  }

  onAudioSettingChanged(event) {
    if (event)
      this.startAudio()
    else
      this.stopAudio();
  }

  stopAudio() {
    if (this.activeRoom)
      this.activeRoom.localParticipant.audioTracks.forEach(track => {
        track.track.disable();
      });
  }

  startAudio() {
    if (this.activeRoom)
      this.activeRoom.localParticipant.audioTracks.forEach(track => {
        track.track.enable();
      });
  }

  async OnScreenShare() {
    let _self = this;
    if (this.activeRoom) {
      //getDisplayMedia works only for chrome browsers.
      const stream = await (navigator.mediaDevices as any).getDisplayMedia();
      this.screenTrack = new LocalVideoTrack(stream.getTracks()[0]);
      this.activeRoom.localParticipant.publishTrack(this.screenTrack);

      stream.getVideoTracks()[0].onended = function () {
        _self.onScreenUnShare()
      };
    }
  }

  onScreenUnShare() {
    this.activeRoom.localParticipant.unpublishTrack(this.screenTrack);
  }

  public copyToClipBoard(value: any) {
    this.videoChatService.copyToClipboard(value);
  }

}

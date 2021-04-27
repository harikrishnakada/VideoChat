import { AfterViewInit, Component, ElementRef, EventEmitter, OnInit, Output, Renderer2, ViewChild } from '@angular/core';
import { createLocalTracks, LocalAudioTrack, LocalTrack, LocalVideoTrack, Room } from 'twilio-video';

/*
 In addition to providing audio and video tracks for room participants to share, the CameraComponent also displays a local camera preview. By rendering locally-created audio and video tracks to the DOM as the <app-camera> element. The Twilio Programmable Video JavaScript Platform SDK, imported from  twilio-video, provides an easy-to-use API for creating and managing the local tracks.

The Angular @ViewChild decorator is used to get a reference to the #preview HTML element used the view. With the reference to the element, the Twilio JavaScript SDK can create local video and audio tracks associated with the device.

Once the tracks are created, the code finds the video track and appends it to the #preview element. The result is a live video feed rendered on the HTML page.
 */
@Component({
  selector: 'app-camera',
  templateUrl: './camera.component.html',
  styleUrls: ['./camera.component.css']
})
export class CameraComponent implements OnInit, AfterViewInit {
  @ViewChild('preview', { static: false }) previewElement: ElementRef;
  @Output() isVideoOn = new EventEmitter<boolean>();
  @Output() isAudioOn = new EventEmitter<boolean>();

  get tracks(): LocalTrack[] {
    return this.localTracks;
  }

  isInitializing: boolean = true;
  activeRoom: Room;

  public videoTrack: LocalVideoTrack;
  public audioTrack: LocalAudioTrack;
  private localTracks: LocalTrack[] = [];

  componentId = Date.now();
  constructor(private readonly renderer: Renderer2) { }

  ngOnInit() {
  }

  async ngAfterViewInit() {
    if (this.previewElement && this.previewElement.nativeElement) {
      await this.initializeDevice();
    }
  }

  initializePreview(deviceInfo?: MediaDeviceInfo) {
    if (deviceInfo) {
      this.initializeDevice(deviceInfo.kind, deviceInfo.deviceId);
    } else {
      this.initializeDevice();
    }
  }

  finalizePreview() {
    try {
      if (this.videoTrack) {
        this.videoTrack.detach().forEach(element => element.remove());
      }
    } catch (e) {
      console.error(e);
    }
  }

  private async initializeDevice(kind?: MediaDeviceKind, deviceId?: string) {
    try {
      this.isInitializing = true;

      this.finalizePreview();

      this.localTracks = kind && deviceId
        ? await this.initializeTracks(kind, deviceId)
        : await this.initializeTracks();

      this.videoTrack = this.localTracks.find(t => t.kind === 'video') as LocalVideoTrack;
      this.audioTrack = this.localTracks.find(t => t.kind === 'audio') as LocalAudioTrack;
      const videoElement = this.videoTrack.attach();
      this.renderer.setStyle(videoElement, 'height', '100%');
      this.renderer.setStyle(videoElement, 'width', '100%');
      this.renderer.appendChild(this.previewElement.nativeElement, videoElement);
    } finally {
      this.isInitializing = false;
    }
  }

  private initializeTracks(kind?: MediaDeviceKind, deviceId?: string) {
    if (kind) {
      switch (kind) {
        case 'audioinput':
          return createLocalTracks({ audio: { deviceId }, video: true });
        case 'videoinput':
          return createLocalTracks({ audio: true, video: { deviceId } });
      }
    }

    return createLocalTracks({ audio: true, video: true });

  }

  stopVideo() {
    this.videoTrack.disable();
    this.isVideoOn.emit(false);

  }

  startVideo() {
    this.videoTrack.enable();
    this.isVideoOn.emit(true);

  }

  stopAudio() {
    this.audioTrack.disable();
    this.isAudioOn.emit(false);
  }

  startAudio() {
    this.audioTrack.enable();
    this.isAudioOn.emit(true);
  }

}

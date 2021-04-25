import { Injectable } from '@angular/core';
import { Observable, ReplaySubject } from 'rxjs';

export type Devices = MediaDeviceInfo[];

/**
This service provides a media devices observable to which concerned listeners can subscribe. When media device information changes, such as unplugging or plugging in a USB web camera, this service will notify all listeners. It also attempts to wait for the user to grant permissions to the various media devices consumed by the twilio-video SDK.

The VideoChatService is used to access the server-side ASP.NET Core Web API endpoints. It exposes the ability to get the list of rooms and the ability to create or join a named room.
*/
@Injectable({
  providedIn: 'root'
})
export class DeviceService {
  $devicesUpdated: Observable<Promise<Devices>>;
  private deviceBroadcast = new ReplaySubject<Promise<Devices>>();

  constructor() {
    if (navigator && navigator.mediaDevices) {
      navigator.mediaDevices.ondevicechange = (_: Event) => {
        this.deviceBroadcast.next(this.getDeviceOptions());
      }
    }

    this.$devicesUpdated = this.deviceBroadcast.asObservable();
    this.deviceBroadcast.next(this.getDeviceOptions());
  }

  private async isGrantedMediaPermissions() {
    if (navigator && navigator['permissions']) {
      try {
        const result = await navigator['permissions'].query({ name: 'camera' });
        if (result) {
          if (result.state === 'granted') {
            return true;
          } else {
            const isGranted = await new Promise<boolean>(resolve => {
              result.onchange = (_: Event) => {
                const granted = _.target['state'] === 'granted';
                if (granted) {
                  resolve(true);
                }
              }
            });

            return isGranted;
          }
        }
      } catch (e) {
        // This is only currently supported in Chrome.
        // https://stackoverflow.com/a/53155894/2410379
        return true;
      }
    }

    return false;
  }

  private async getDeviceOptions(): Promise<Devices> {
    const isGranted = await this.isGrantedMediaPermissions();
    if (navigator && navigator.mediaDevices && isGranted) {
      let devices = await this.tryGetDevices();
      if (devices.every(d => !d.label)) {
        devices = await this.tryGetDevices();
      }
      return devices;
    }

    return null;
  }

  private async tryGetDevices() {
    const mediaDevices = await navigator.mediaDevices.enumerateDevices();
    const devices = ['audioinput', 'audiooutput', 'videoinput'].reduce((options, kind) => {
      return options[kind] = mediaDevices.filter(device => device.kind === kind);
    }, [] as Devices);

    return devices;
  }
}

import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

/*
 If a media device option is not available to select, the DeviceSelectComponent object is not rendered. When an option is available, the user can configure their desired device.

As the user changes the selected device, the component emits an event to any active listeners, enabling them to take action on the currently selected device. The list of available devices is  dynamically updated as devices are connected to, or removed from, the user’s computer.

The DeviceSelectComponent object is intended to encapsulate the selection of devices. Rather than bloating the settings component with redundancy, there is a single component that is reused and parameterized with @Input and @Output decorators.
 * */

class IdGenerator {
  protected static id: number = 0;
  static getNext() {
    return ++IdGenerator.id;
  }
}

@Component({
  selector: 'app-device-select',
  templateUrl: './device-select.component.html',
  styleUrls: ['./device-select.component.css']
})
export class DeviceSelectComponent implements OnInit {
  private localDevices: MediaDeviceInfo[] = [];

  id: string;
  selectedId: string;

  get devices(): MediaDeviceInfo[] {
    return this.localDevices;
  }

  @Input() label: string;
  @Input() kind: MediaDeviceKind;
  @Input() set devices(devices: MediaDeviceInfo[]) {
    this.selectedId = this.find(this.localDevices = devices);
  }

  @Output() settingsChanged = new EventEmitter<MediaDeviceInfo>();

  constructor() {
    this.id = `device-select-${IdGenerator.getNext()}`;
  }

  ngOnInit() {
  }

  onSettingsChanged(deviceId: string) {
    this.setAndEmitSelections(this.selectedId = deviceId);
  }

  private find(devices: MediaDeviceInfo[]) {
    if (devices && devices.length > 0) {
      return devices[0].deviceId;
    }

    return null;
  }

  private setAndEmitSelections(deviceId: string) {
    this.settingsChanged.emit(this.devices.find(d => d.deviceId === deviceId));
  }

}

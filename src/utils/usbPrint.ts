import { buildEscPosTicket, EscPosTicket } from './escpos';

export type UsbPrintOutcome = 'printed' | 'no-usb' | 'cancelled' | 'error';

interface UsbEndpoint {
  endpointNumber: number;
  direction: 'in' | 'out';
  type: string;
}

interface UsbInterface {
  interfaceNumber: number;
  alternate: {
    interfaceClass: number;
    endpoints: UsbEndpoint[];
  };
}

interface UsbDeviceMinimal {
  deviceClass: number;
  productName?: string;
  opened: boolean;
  configuration?: { interfaces: UsbInterface[] };
  open(): Promise<void>;
  close(): Promise<void>;
  selectConfiguration(configurationValue: number): Promise<void>;
  claimInterface(interfaceNumber: number): Promise<void>;
  transferOut(endpointNumber: number, data: Uint8Array): Promise<any>;
}

interface UsbMinimal {
  getDevices(): Promise<UsbDeviceMinimal[]>;
  requestDevice(options: { filters: Array<{ classCode?: number }> }): Promise<UsbDeviceMinimal>;
}

interface UsbNavigator extends Navigator {
  usb?: UsbMinimal;
}

let cachedDevice: UsbDeviceMinimal | null = null;

const isPrinterDevice = (device: UsbDeviceMinimal): boolean => device.deviceClass === 7;

export const printTicketUsb = async (ticket: EscPosTicket): Promise<UsbPrintOutcome> => {
  const nav = navigator as UsbNavigator;

  if (!nav.usb) {
    return 'no-usb';
  }

  let device = cachedDevice;

  if (!device) {
    const existing = await nav.usb.getDevices();
    device = existing.find(isPrinterDevice) ?? null;
  }

  if (!device) {
    try {
      device = await nav.usb.requestDevice({ filters: [{ classCode: 7 }] });
    } catch {
      return 'cancelled';
    }
    cachedDevice = device;
  }

  if (!device) {
    return 'cancelled';
  }

  try {
    const data = buildEscPosTicket(ticket);

    if (!device.opened) {
      await device.open();
    }
    if (!device.configuration) {
      await device.selectConfiguration(1);
    }

    const printerInterface = device.configuration?.interfaces.find(
      (intf) => intf.alternate && intf.alternate.interfaceClass === 7
    );
    if (!printerInterface) {
      await device.close();
      return 'error';
    }

    await device.claimInterface(printerInterface.interfaceNumber);

    const outEndpoint = printerInterface.alternate.endpoints.find(
      (endpoint) => endpoint.direction === 'out' && endpoint.type === 'bulk'
    );
    if (!outEndpoint) {
      await device.close();
      return 'error';
    }

    const copies = Math.max(1, Math.round(Number(ticket.copies || 1)));
    for (let i = 0; i < copies; i++) {
      await device.transferOut(outEndpoint.endpointNumber, data);
    }

    await device.close();
    return 'printed';
  } catch {
    try {
      await device.close();
    } catch {
      // ignorar error de cierre
    }
    return 'error';
  }
};
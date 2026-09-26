// Encoder ESC/POS para tickets. Los navegadores no pueden elegir impresora,
// por eso los tickets se mandan directo por USB (WebUSB) a impresoras térmicas.

export interface EscPosTicketLine {
  label: string;
  value: string;
}

export interface EscPosTicketItem {
  name: string;
  qty: number;
  price: number;
}

export interface EscPosTicket {
  title: string;
  subtitle: string;
  header: EscPosTicketLine[];
  items: EscPosTicketItem[];
  total?: number;
  payments?: EscPosTicketLine[];
  footer: string;
  copies?: number;
}

const WIDTH = 42;

const normalize = (text: string): string =>
  String(text ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const encoder = new TextEncoder();

const append = (out: number[], ...values: Array<number[] | Uint8Array>): void => {
  for (const value of values) {
    for (const byte of value) {
      out.push(byte);
    }
  }
};

const pushLine = (out: number[], text: string, align: 0 | 1 | 2, bold: boolean, double: boolean): void => {
  append(out, [0x1b, 0x61, align]);
  append(out, [0x1b, 0x45, bold ? 1 : 0]);
  append(out, [0x1b, 0x21, double ? 0x30 : 0x00]);
  append(out, encoder.encode(normalize(text)));
  out.push(0x0a);
};

const pushRule = (out: number[], char = '-'): void => {
  pushLine(out, char.repeat(WIDTH), 0, false, false);
};

const pushRow = (out: number[], left: string, right: string, label?: string): void => {
  const l = String(left ?? '');
  const r = String(right ?? '');
  if (label) {
    pushLine(out, `${l?.toUpperCase()}:`, 0, true, false);
  }
  const available = Math.max(1, WIDTH - 1 - r.length);
  const text = l.length <= available ? `${l}${' '.repeat(available - l.length)} ${r}` : `${l.slice(0, available)} ${r}`;
  pushLine(out, text, 0, false, false);
};

const pushItem = (out: number[], item: EscPosTicketItem): void => {
  const name = item.name || `Producto #?`;
  const price = (Number(item.price || 0) * (Number(item.qty) || 1)).toFixed(2);
  pushRow(out, `${item.qty} x ${name}`, `$${price}`);
};

export const buildEscPosTicket = (ticket: EscPosTicket): Uint8Array => {
  const out: number[] = [];
  const money = (value: number): string => `$${Number(value || 0).toFixed(2)}`;

  append(out, [0x1b, 0x40]);

  if (ticket.title) {
    pushLine(out, ticket.title.toUpperCase(), 1, true, true);
  }
  if (ticket.subtitle) {
    pushLine(out, ticket.subtitle, 1, false, false);
  }
  out.push(0x0a);

  (ticket.header || []).forEach((line) => pushRow(out, line.value, '', line.label));

  out.push(0x0a);
  pushRule(out);
  (ticket.items || []).forEach((item) => pushItem(out, item));
  if (!ticket.items || ticket.items.length === 0) {
    pushLine(out, 'Sin productos en este consumo', 0, false, false);
  }
  pushRule(out);

  if (ticket.total !== undefined) {
    append(out, [0x1b, 0x45, 1]);
    pushLine(out, `${'TOTAL:'.padEnd(WIDTH - 6)}${money(ticket.total)}`, 0, true, false);
    append(out, [0x1b, 0x45, 0]);
  }

  (ticket.payments || []).forEach((payment) => pushRow(out, payment.value, payment.label));

  out.push(0x0a);
  pushLine(out, ticket.footer, 1, false, true);
  out.push(0x0a, 0x0a, 0x0a);
  append(out, [0x1b, 0x69]);

  return Uint8Array.from(out);
};
import { describe, it, expect } from 'vitest';
import { transfermovilLink, datosTransfermovilTexto } from '../../src/lib/payments';

describe('payments (Transfermóvil)', () => {
  it('genera deep link con monto y concepto', () => {
    const link = transfermovilLink({ monto: 2500, concepto: 'Pedido #12' });
    expect(link.startsWith('transfermovil://')).toBe(true);
    expect(link).toContain('amount=2500');
    expect(link).toContain('concept=');
  });

  it('limpia el teléfono a solo dígitos', () => {
    const link = transfermovilLink({ monto: 100, concepto: 'x', telefono: '+53 5470-4764' });
    expect(link).toContain('phone=5354704764');
  });

  it('genera texto copiable con monto y concepto', () => {
    const txt = datosTransfermovilTexto({ monto: 3200, concepto: 'Pedido #3' });
    expect(txt).toContain('Transfermóvil');
    expect(txt).toContain('Pedido #3');
  });
});

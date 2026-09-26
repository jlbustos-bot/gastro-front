import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { consumoService, Consumo } from '../services/consumoService';
import { mesaService, Mesa } from '../services/mesaService';
import { medioPagoService, MedioPago } from '../services/medioPagoService';
import './Mesas.css';
import './Consumos.css';

const estadoLabels: Record<string, string> = {
  abierta: 'Abierta',
  pagada: 'Pagada',
  anulada: 'Anulada',
  libre: 'Libre',
  ocupada: 'Ocupada',
  reservada: 'Reservada',
  inactiva: 'Inactiva',
};

interface PaymentDraft {
  medio_pago_id: number;
  monto: string;
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

const sortByOrdenNombre = (a: MedioPago, b: MedioPago): number => {
  const ordenA = a.orden ?? 2147483647;
  const ordenB = b.orden ?? 2147483647;
  if (ordenA !== ordenB) {
    return ordenA - ordenB;
  }
  return (a.nombre || '').localeCompare(b.nombre || '', 'es');
};

const ConsumosPage = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<Consumo[]>([]);
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [mediosPago, setMediosPago] = useState<MedioPago[]>([]);
  const [loading, setLoading] = useState(true);

  const [payingConsumo, setPayingConsumo] = useState<Consumo | null>(null);
  const [paymentDetail, setPaymentDetail] = useState<Consumo | null>(null);
  const [payments, setPayments] = useState<PaymentDraft[]>([]);
  const [paying, setPaying] = useState(false);

  const fetchItems = async () => {
    try {
      const data = await consumoService.getAll();
      setItems(data);
    } catch (error) {
      console.error('Error al cargar consumos:', error);
    }
  };

  const fetchMesas = async () => {
    try {
      const data = await mesaService.getAll({ activo: true });
      setMesas(data);
    } catch (error) {
      console.error('Error al cargar mesas:', error);
    }
  };

  const fetchMediosPago = async () => {
    try {
      const data = await medioPagoService.getAll({ activo: true });
      setMediosPago(data);
    } catch (error) {
      console.error('Error al cargar medios de pago:', error);
    }
  };

  const sortedMediosPago = useMemo<MedioPago[]>(
    () => [...mediosPago].sort(sortByOrdenNombre),
    [mediosPago]
  );

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchItems(), fetchMesas(), fetchMediosPago()]);
      setLoading(false);
    };
    loadData();
  }, []);

  const getConsumoPorMesa = (mesaId?: number): Consumo | undefined =>
    items.find((item) => item.mesa_id === mesaId && item.estado === 'abierta');

  const handleSelectMesa = (mesa: Mesa) => {
    navigate(`/consumos/mesa/${mesa.id}`);
  };

  const handleEdit = (item: Consumo) => {
    navigate(`/consumos/editar/${item.id}`);
  };

  const handleDelete = async (id?: number) => {
    if (!id || !confirm('¿Está seguro de eliminar este consumo?')) {
      return;
    }

    try {
      await consumoService.delete(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      await fetchMesas();
    } catch (error: any) {
      console.error('Error al eliminar consumo:', error);
      alert(error?.response?.data?.error || 'No se pudo eliminar el consumo');
    }
  };

  const openPayModal = async (item: Consumo) => {
    if (!item.id) {
      return;
    }

    setPayingConsumo(item);
    setPayments([]);
    setPaymentDetail(null);

    try {
      const detail = await consumoService.getById(item.id);
      setPaymentDetail(detail);
    } catch (error) {
      console.error('Error al obtener detalle del consumo:', error);
    }
  };

  const closePayModal = () => {
    if (paying) {
      return;
    }
    setPayingConsumo(null);
    setPaymentDetail(null);
    setPayments([]);
  };

  const ticketTotal = paymentDetail
    ? round2(Number(paymentDetail.total || 0))
    : round2(Number(payingConsumo?.total || 0));

  const totalPaid = round2(
    payments.reduce((sum, p) => sum + (parseFloat(p.monto) || 0), 0)
  );

  const remaining = round2(ticketTotal - totalPaid);

  const effectivePayments = payments.filter((p) => (parseFloat(p.monto) || 0) > 0);
  const canConfirm = effectivePayments.length > 0 && Math.abs(remaining) < 0.01;

  const toggleMedio = (mp: MedioPago) => {
    const id = mp.id;
    if (id === undefined) {
      return;
    }
    setPayments((prev) => {
      const exists = prev.find((p) => p.medio_pago_id === id);
      if (exists) {
        return prev.filter((p) => p.medio_pago_id !== id);
      }
      return [...prev, { medio_pago_id: id, monto: '' }];
    });
  };

  const updateMonto = (medioPagoId: number, value: string) => {
    setPayments((prev) =>
      prev.map((p) => (p.medio_pago_id === medioPagoId ? { ...p, monto: value } : p))
    );
  };

  const setResto = (medioPagoId: number) => {
    setPayments((prev) =>
      prev.map((p) =>
        p.medio_pago_id === medioPagoId ? { ...p, monto: Math.max(0, remaining).toFixed(2) } : p
      )
    );
  };

  const splitEqual = () => {
    if (payments.length === 0) {
      alert('Debe elegir al menos un medio de pago antes de repartir el total');
      return;
    }
    const ids = payments.map((p) => p.medio_pago_id);
    const share = round2(ticketTotal / ids.length);
    const drafts: PaymentDraft[] = ids.map((id, index) => {
      const isLast = index === ids.length - 1;
      const monto = isLast ? round2(ticketTotal - share * (ids.length - 1)) : share;
      return { medio_pago_id: id, monto: monto.toFixed(2) };
    });
    setPayments(drafts);
  };

  const confirmPayment = async () => {
    if (!payingConsumo?.id || !canConfirm) {
      return;
    }

    const pagos = effectivePayments.map((p) => ({
      medio_pago_id: p.medio_pago_id,
      monto: round2(parseFloat(p.monto) || 0),
    }));

    setPaying(true);
    try {
      await consumoService.pay(payingConsumo.id, pagos);
      await Promise.all([fetchItems(), fetchMesas()]);
      setPayingConsumo(null);
      setPaymentDetail(null);
      setPayments([]);
    } catch (error: any) {
      console.error('Error al registrar el pago:', error);
      alert(error?.response?.data?.error || error?.response?.data?.details || 'No se pudo registrar el pago');
    } finally {
      setPaying(false);
    }
  };

  const handlePrintTicket = () => {
    window.print();
  };

  const ticketItems = paymentDetail?.items ?? [];
  const medioNombre = (id: number): string =>
    mediosPago.find((mp) => mp.id === id)?.nombre ?? `Medio #${id}`;

  if (loading) {
    return <div>Cargando consumos...</div>;
  }

  return (
    <div className="consumos">
      <div className="consumos-header">
        <div>
          <h1>Consumos por Mesa</h1>
          <p className="subtitle">Seleccione una mesa para registrar el consumo de los clientes</p>
        </div>
      </div>

      <h2 className="section-title">Mesas</h2>
      <div className="mesa-grid">
        {mesas.length === 0 ? (
          <div className="empty-state">No hay mesas registradas</div>
        ) : (
          mesas.map((mesa) => {
            const consumoAbierto = getConsumoPorMesa(mesa.id);
            return (
              <div key={mesa.id} className="mesa-card" onClick={() => handleSelectMesa(mesa)}>
                <div className="mesa-top">
                  <span className={`mesa-number ${mesa.estado}`}>Mesa {mesa.numero}</span>
                  <span className={`badge ${mesa.estado}`}>
                    {estadoLabels[mesa.estado] ?? mesa.estado}
                  </span>
                </div>
                <p><strong>Capacidad:</strong> {mesa.capacidad} personas</p>
                <p><strong>Ubicación:</strong> {mesa.ubicacion || '—'}</p>
                {consumoAbierto ? (
                  <div className="mesa-consumo-abierto">
                    <p>
                      <strong>Consumo #{consumoAbierto.id}:</strong>{' '}
                      {consumoAbierto.cliente_nombre || 'Sin cliente'} - $
                      {Number(consumoAbierto.total).toFixed(2)}
                    </p>
                  </div>
                ) : (
                  <p className="mesa-sin-consumo">Sin consumo activo</p>
                )}
                <div className="card-actions">
                  <button
                    className="btn-primary"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectMesa(mesa);
                    }}
                  >
                    {consumoAbierto ? 'Continuar consumo' : 'Registrar consumo'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <h2 className="section-title">Consumos registrados</h2>
      {items.length === 0 ? (
        <div className="empty-state">No hay consumos registrados</div>
      ) : (
        <div className="consumos-table">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Mesa</th>
                <th>Cliente</th>
                <th>Estado</th>
                <th>Total</th>
                <th>Medio de pago</th>
                <th>Fecha caja</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>#{item.id}</td>
                  <td>Mesa {item.mesa_numero ?? item.mesa_id}</td>
                  <td>{item.cliente_nombre || '—'}</td>
                  <td>
                    <span className={`badge ${item.estado}`}>
                      {estadoLabels[item.estado] ?? item.estado}
                    </span>
                  </td>
                  <td>${Number(item.total).toFixed(2)}</td>
                  <td>{item.medio_pago_nombre || '—'}</td>
                  <td>{item.fecha_caja ? String(item.fecha_caja).slice(0, 10) : '—'}</td>
                  <td>
                    <div className="table-actions">
                      <button className="btn-success" onClick={() => openPayModal(item)} disabled={item.estado !== 'abierta'}>
                        Cobrar
                      </button>
                      <button className="btn-primary" onClick={() => handleEdit(item)}>Editar</button>
                      <button className="btn-danger" onClick={() => handleDelete(item.id)}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {payingConsumo && (
        <div className="pay-modal-overlay" onClick={closePayModal}>
          <div className="pay-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pay-modal-header">
              <div>
                <h2>Cobrar consumo #{payingConsumo.id}</h2>
                <p className="subtitle">
                  Mesa {payingConsumo.mesa_numero ?? payingConsumo.mesa_id} ·{' '}
                  {payingConsumo.cliente_nombre || 'Sin cliente'} ·{' '}
                  <strong>Total ${ticketTotal.toFixed(2)}</strong>
                </p>
              </div>
              <button type="button" className="pay-modal-close" onClick={closePayModal} aria-label="Cerrar">
                ✕
              </button>
            </div>

            <div className="pay-modal-body">
              <div className="pay-select-section">
                <h3>Medios de pago combinados</h3>
                {sortedMediosPago.length === 0 ? (
                  <div className="empty-state">No hay medios de pago activos</div>
                ) : (
                  <>
                    <button type="button" className="btn-secondary pay-split-btn" onClick={splitEqual}>
                      Repartir en partes iguales
                    </button>
                    <div className="pay-methods">
                      {sortedMediosPago.map((mp) => {
                        const draft = payments.find((p) => p.medio_pago_id === mp.id);
                        const selected = Boolean(draft);
                        return (
                          <div key={mp.id} className={`pay-method ${selected ? 'selected' : ''}`}>
                            <button
                              type="button"
                              className="pay-method-toggle"
                              onClick={() => toggleMedio(mp)}
                            >
                              <span className="checkbox-box">{selected ? '✓' : ''}</span>
                              <span className="pay-method-name">{mp.nombre}</span>
                              {mp.descripcion && <span className="pay-method-desc">{mp.descripcion}</span>}
                            </button>
                            {draft && (
                              <div className="pay-method-amount">
                                <span className="pay-amount-label">Monto</span>
                                <div className="pay-amount-row">
                                  <span className="pay-currency">$</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={draft.monto}
                                    placeholder="0.00"
                                    onChange={(e) => updateMonto(mp.id!, e.target.value)}
                                  />
                                  <button
                                    type="button"
                                    className="btn-secondary pay-resto-btn"
                                    onClick={() => setResto(mp.id!)}
                                  >
                                    Resto
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="pay-summary">
                      <div className="pay-summary-row">
                        <span>Total del consumo</span>
                        <strong>${ticketTotal.toFixed(2)}</strong>
                      </div>
                      <div className="pay-summary-row">
                        <span>Parcial asignado</span>
                        <strong>${totalPaid.toFixed(2)}</strong>
                      </div>
                      <div className="pay-summary-row remaining">
                        <span>Restante</span>
                        <strong>${remaining.toFixed(2)}</strong>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="pay-ticket-preview">
                <h3>Vista previa del ticket</h3>
                <div className="pay-ticket">
                  <div className="ticket-header">
                    <div className="ticket-title">GastroSoft</div>
                    <div className="ticket-subtitle">Sistema de Gestión Gastronómica</div>
                  </div>
                  <div className="ticket-divider">-</div>
                  <div className="ticket-line"><span>Consumo:</span> <strong>#{payingConsumo.id}</strong></div>
                  <div className="ticket-line"><span>Mesa:</span> <strong>{payingConsumo.mesa_numero ?? payingConsumo.mesa_id}</strong></div>
                  <div className="ticket-line"><span>Cliente:</span> <strong>{payingConsumo.cliente_nombre || 'Sin cliente'}</strong></div>
                  <div className="ticket-line"><span>Fecha:</span> <strong>{new Date().toLocaleString()}</strong></div>
                  <div className="ticket-divider">-</div>
                  {ticketItems.length === 0 ? (
                    <div className="ticket-empty">Sin productos en este consumo</div>
                  ) : (
                    ticketItems.map((it, idx) => (
                      <div className="ticket-item" key={idx}>
                        <div className="ticket-item-name">
                          {it.cantidad} x {it.producto_nombre || `Producto #${it.producto_id}`}
                        </div>
                        <div className="ticket-item-price">
                          ${(Number(it.precio) * (it.cantidad || 1)).toFixed(2)}
                        </div>
                      </div>
                    ))
                  )}
                  <div className="ticket-divider">-</div>
                  <div className="ticket-line ticket-total"><span>TOTAL:</span> <strong>${ticketTotal.toFixed(2)}</strong></div>
                  {effectivePayments.length === 0 ? (
                    <div className="ticket-line"><span>Medio de pago:</span> <strong>Por elegir</strong></div>
                  ) : (
                    effectivePayments.map((p, idx) => (
                      <div className="ticket-line" key={idx}>
                        <span>{medioNombre(p.medio_pago_id)}</span>
                        <strong>${round2(parseFloat(p.monto) || 0).toFixed(2)}</strong>
                      </div>
                    ))
                  )}
                  <div className="ticket-divider">-</div>
                  <div className="ticket-footer">¡Gracias por su visita!</div>
                </div>
              </div>
            </div>

            <div className="pay-modal-actions">
              <button type="button" className="btn-secondary" onClick={closePayModal}>
                Cancelar
              </button>
              <button type="button" className="btn-primary" onClick={handlePrintTicket}>
                🖨️ Imprimir ticket
              </button>
              <button
                type="button"
                className="btn-success"
                onClick={confirmPayment}
                disabled={paying || !canConfirm}
                title={!canConfirm ? 'Debe cubrir el total asignando montos a los medios de pago' : ''}
              >
                {paying ? 'Procesando...' : 'Confirmar pago'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsumosPage;
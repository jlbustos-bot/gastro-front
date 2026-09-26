import { useEffect, useState } from 'react';
import { reporteService, VentaDiaria } from '../services/reporteService';
import './ReporteVentaDiaria.css';

const toDateString = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const defaultFechaCaja = (): string => {
  const now = new Date();
  const cajaDate = new Date(now);
  if (now.getHours() < 8) {
    cajaDate.setDate(cajaDate.getDate() - 1);
  }
  return toDateString(cajaDate);
};

const formatFecha = (fecha: string): string => {
  const [y, m, d] = fecha.split('-');
  return `${d}/${m}/${y}`;
};

const ReporteVentaDiaria = () => {
  const [fecha, setFecha] = useState<string>(defaultFechaCaja);
  const [data, setData] = useState<VentaDiaria | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async (f: string) => {
    setLoading(true);
    setError('');
    try {
      const result = await reporteService.ventaDiaria(f);
      setData(result);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Error al cargar el reporte');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(defaultFechaCaja());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConsultar = () => {
    if (fecha) {
      load(fecha);
    }
  };

  const handleImprimir = () => {
    window.print();
  };

  return (
    <div className="reporte-container">
      <div className="reporte-screen">
        <h2>Informe de venta diaria</h2>
        <div className="reporte-filters">
          <label htmlFor="fecha-caja">Fecha caja</label>
          <input
            id="fecha-caja"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
          />
          <button type="button" className="btn-primary" onClick={handleConsultar} disabled={loading}>
            {loading ? 'Cargando...' : 'Consultar'}
          </button>
          <button type="button" className="btn-secondary" onClick={handleImprimir} disabled={!data}>
            Imprimir
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {data && (
          <>
            <div className="reporte-summary-cards">
              <div className="stat-card">
                <span className="stat-icon">💰</span>
                <div>
                  <div className="stat-label">Total del día</div>
                  <div className="stat-value">${data.total_general.toFixed(2)}</div>
                </div>
              </div>
              <div className="stat-card">
                <span className="stat-icon">🧾</span>
                <div>
                  <div className="stat-label">Consumos cobrados</div>
                  <div className="stat-value">{data.cantidad_consumos}</div>
                </div>
              </div>
            </div>

            <h3>Totales por medio de pago</h3>
            <div className="table-wrapper">
              <table className="reporte-table">
                <thead>
                  <tr>
                    <th>Medio de pago</th>
                    <th>Operaciones</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.medios.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="empty-cell">Sin ventas para la fecha seleccionada</td>
                    </tr>
                  ) : (
                    data.medios.map((medio) => (
                      <tr key={medio.medio_pago_id}>
                        <td>{medio.nombre}</td>
                        <td>{medio.cantidad}</td>
                        <td>${medio.total.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {data.medios.length > 0 && (
                  <tfoot>
                    <tr>
                      <td colSpan={2}>TOTAL</td>
                      <td>${data.total_general.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            <h3>Detalle de consumos</h3>
            <div className="table-wrapper">
              <table className="reporte-table">
                <thead>
                  <tr>
                    <th>Nº</th>
                    <th>Mesa</th>
                    <th>Cliente</th>
                    <th>Medio de pago</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.consumos.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="empty-cell">Sin consumos para la fecha seleccionada</td>
                    </tr>
                  ) : (
                    data.consumos.map((consumo, index) => (
                      <tr key={consumo.id}>
                        <td>{index + 1}</td>
                        <td>{consumo.mesa_numero}</td>
                        <td>{consumo.cliente_nombre || '—'}</td>
                        <td>{consumo.medio_pago_nombre || '—'}</td>
                        <td>${Number(consumo.total).toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {data && (
        <div className="report-ticket">
          <div className="ticket-header">
            <div className="ticket-title">CIERRE DE CAJA</div>
            <div className="ticket-subtitle">Venta diaria</div>
          </div>
          <div className="ticket-divider">- - - - - - - - - - - - - - - -</div>
          <div className="ticket-line">
            <span>Fecha caja</span>
            <strong>{formatFecha(data.fecha_caja)}</strong>
          </div>
          <div className="ticket-divider">- - - - - - - - - - - - - - - -</div>
          {data.medios.length === 0 && <div className="ticket-empty">Sin ventas registradas</div>}
          {data.medios.map((medio) => (
            <div className="ticket-line" key={medio.medio_pago_id}>
              <span>{medio.nombre}</span>
              <strong>${medio.total.toFixed(2)}</strong>
            </div>
          ))}
          <div className="ticket-divider">- - - - - - - - - - - - - - - -</div>
          <div className="ticket-line">
            <span>Consumos</span>
            <strong>{data.cantidad_consumos}</strong>
          </div>
          <div className="ticket-line ticket-total">
            <span>TOTAL</span>
            <strong>${data.total_general.toFixed(2)}</strong>
          </div>
          <div className="ticket-footer">Gracias por su preferencia</div>
        </div>
      )}
    </div>
  );
};

export default ReporteVentaDiaria;
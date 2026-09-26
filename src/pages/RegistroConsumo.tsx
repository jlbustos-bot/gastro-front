import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { consumoService, Consumo, ConsumoItem } from '../services/consumoService';
import { mesaService, Mesa } from '../services/mesaService';
import { clienteService, Cliente } from '../services/clienteService';
import { productoService, Producto } from '../services/productoService';
import './Consumos.css';

interface FormItem {
  producto_id: number | null;
  cantidad: number;
}

const estadoLabels: Record<string, string> = {
  abierta: 'Abierta',
  pagada: 'Pagada',
  anulada: 'Anulada',
  libre: 'Libre',
  ocupada: 'Ocupada',
  reservada: 'Reservada',
  inactiva: 'Inactiva',
};

const createEmptyForm = () => ({
  mesa_id: 0,
  cliente_id: null as number | null,
  estado: 'abierta' as Consumo['estado'],
  items: [] as FormItem[],
});

const RegistroConsumo = () => {
  const navigate = useNavigate();
  const { mesaId, consumoId } = useParams<{ mesaId?: string; consumoId?: string }>();

  const [loading, setLoading] = useState(true);
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [clienteOptions, setClienteOptions] = useState<Cliente[]>([]);
  const [productoOptions, setProductoOptions] = useState<Producto[]>([]);
  const [formData, setFormData] = useState(createEmptyForm());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const mesaSeleccionada = useMemo(
    () => mesas.find((mesa) => mesa.id === formData.mesa_id),
    [mesas, formData.mesa_id]
  );

  useEffect(() => {
    const loadPage = async () => {
      try {
        const [mesasData, clientesData, productosData] = await Promise.all([
          mesaService.getAll({ activo: true }),
          clienteService.getAll({ activo: true }),
          productoService.getAll({ activo: true }),
        ]);
        setMesas(mesasData);
        setClienteOptions(clientesData);
        setProductoOptions(productosData);

        if (consumoId) {
          const consumo = await consumoService.getById(Number(consumoId));
          setEditingId(consumo.id ?? null);
          setFormData({
            mesa_id: consumo.mesa_id,
            cliente_id: consumo.cliente_id ?? null,
            estado: consumo.estado,
            items: (consumo.items ?? []).map((it: ConsumoItem) => ({
              producto_id: it.producto_id,
              cantidad: it.cantidad,
            })),
          });
        } else if (mesaId) {
          const mesa = mesasData.find((m) => m.id === Number(mesaId));
          if (!mesa) {
            alert('La mesa seleccionada no existe');
            navigate('/consumos', { replace: true });
            return;
          }

          const consumos = await consumoService.getAll();
          const abierto = consumos.find(
            (c) => c.mesa_id === Number(mesaId) && c.estado === 'abierta'
          );

          if (abierto) {
            const detail = abierto.items?.length ? abierto : await consumoService.getById(abierto.id ?? 0);
            setEditingId(detail.id ?? null);
            setFormData({
              mesa_id: detail.mesa_id,
              cliente_id: detail.cliente_id ?? null,
              estado: detail.estado,
              items: (detail.items ?? []).map((it: ConsumoItem) => ({
                producto_id: it.producto_id,
                cantidad: it.cantidad,
              })),
            });
          } else {
            setEditingId(null);
            setFormData((prev) => ({ ...prev, mesa_id: Number(mesaId), estado: 'abierta' }));
          }
        }
      } catch (error: any) {
        console.error('Error al cargar la pantalla de registro:', error);
        alert(error?.response?.data?.error || 'No se pudo cargar la pantalla de registro');
      } finally {
        setLoading(false);
      }
    };

    loadPage();
  }, [mesaId, consumoId, navigate]);

  const getProductoPrecio = (productoId: number | null): number => {
    const producto = productoOptions.find((p) => p.id === productoId);
    return producto ? Number(producto.precioventa ?? 0) : 0;
  };

  const getFormTotal = (): number =>
    formData.items.reduce((sum, item) => sum + getProductoPrecio(item.producto_id) * (item.cantidad || 0), 0);

  const handleItemChange = (index: number, field: keyof FormItem, value: number) => {
    setFormData((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  };

  const addItem = () => {
    setFormData((prev) => ({ ...prev, items: [...prev.items, { producto_id: null, cantidad: 1 }] }));
  };

  const removeItem = (index: number) => {
    setFormData((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.mesa_id) {
      alert('Debe seleccionar una mesa');
      return;
    }

    const validItems = formData.items.filter((item) => item.producto_id);
    if (validItems.length === 0) {
      alert('Debe agregar al menos un producto al consumo');
      return;
    }

    const payload = {
      mesa_id: Number(formData.mesa_id),
      cliente_id: formData.cliente_id || null,
      estado: formData.estado,
      items: validItems.map((item) => ({ producto_id: item.producto_id as number, cantidad: item.cantidad || 1 })),
    };

    setSaving(true);
    try {
      if (editingId) {
        await consumoService.update(editingId, payload);
      } else {
        await consumoService.create(payload);
      }
      await consumoService.getAll();
      alert(editingId ? 'Consumo actualizado correctamente.' : 'Consumo registrado correctamente.');
      navigate('/consumos');
    } catch (error: any) {
      console.error('Error al guardar consumo:', error);
      alert(error?.response?.data?.error || 'No se pudo guardar el consumo');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="consumos">
      <div className="consumos-header">
        <div>
          <h1>{editingId ? `Editar consumo #${editingId}` : `Registrar consumo - Mesa ${mesaSeleccionada?.numero ?? ''}`}</h1>
          <p className="subtitle">Cargue los productos consumidos en la mesa</p>
        </div>
        <div className="consumos-actions">
          <button className="btn-secondary" type="button" onClick={() => navigate('/consumos')}>
            ← Volver a Consumos por Mesa
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="consumos-form">
        <div className="form-grid">
          <div className="form-group">
            <label>Mesa</label>
            <select
              name="mesa_id"
              value={formData.mesa_id}
              onChange={(e) => setFormData((prev) => ({ ...prev, mesa_id: Number(e.target.value) }))}
              required
            >
              <option value={0}>Seleccione una mesa</option>
              {mesas.map((mesa) => (
                <option key={mesa.id} value={mesa.id ?? ''}>
                  Mesa {mesa.numero} - {estadoLabels[mesa.estado] ?? mesa.estado}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Cliente</label>
            <select
              name="cliente_id"
              value={formData.cliente_id ?? ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, cliente_id: e.target.value === '' ? null : Number(e.target.value) }))}
            >
              <option value="">Sin cliente</option>
              {clienteOptions.map((cliente) => (
                <option key={cliente.id} value={cliente.id ?? ''}>
                  {cliente.apellido}, {cliente.nombre}
                  {cliente.documento ? ` (${cliente.documento})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Estado</label>
            <select
              name="estado"
              value={formData.estado}
              onChange={(e) => setFormData((prev) => ({ ...prev, estado: e.target.value as Consumo['estado'] }))}
            >
              <option value="abierta">Abierta</option>
              <option value="pagada">Pagada</option>
              <option value="anulada">Anulada</option>
            </select>
          </div>
        </div>

        <div className="consumo-items">
          <div className="consumo-items-header">
            <span>Productos del consumo</span>
            <button type="button" className="btn-secondary" onClick={addItem}>+ Agregar producto</button>
          </div>

          {formData.items.length === 0 && (
            <div className="empty-state">No hay productos cargados</div>
          )}

          {formData.items.map((item, index) => (
            <div key={index} className="consumo-item-row">
              <div className="form-group">
                <label>Producto</label>
                <select
                  value={item.producto_id ?? ''}
                  onChange={(e) => handleItemChange(index, 'producto_id', e.target.value === '' ? 0 : Number(e.target.value))}
                >
                  <option value="">Seleccione un producto</option>
                  {productoOptions.map((producto) => (
                    <option key={producto.id} value={producto.id ?? ''}>
                      {producto.nombre} - ${Number(producto.precioventa).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Cantidad</label>
                <input
                  type="number"
                  min="1"
                  value={item.cantidad}
                  onChange={(e) => handleItemChange(index, 'cantidad', Number(e.target.value || 0))}
                />
              </div>
              <div className="form-group">
                <label>Subtotal</label>
                <div className="item-subtotal">
                  ${(getProductoPrecio(item.producto_id) * (item.cantidad || 0)).toFixed(2)}
                </div>
              </div>
              <button type="button" className="btn-danger item-remove" onClick={() => removeItem(index)}>
                Quitar
              </button>
            </div>
          ))}
        </div>

        <div className="consumo-total">Total: ${getFormTotal().toFixed(2)}</div>

        <div className="form-actions">
          <button type="submit" className="btn-success" disabled={saving}>
            {saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Guardar consumo'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate('/consumos')}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
};

export default RegistroConsumo;
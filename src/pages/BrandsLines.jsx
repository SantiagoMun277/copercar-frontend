import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageTitle from '../components/PageTitle'
import Modal from '../components/Modal'
import { backendMode } from '../services/api'
import * as catalogos from '../services/brandsLines'

// El GET de Juan lista solo activos. Este registro local muestra únicamente
// los inactivos que se desactivaron desde este navegador; nunca se presenta
// como un listado completo de la base de datos.
const CACHE_KEY = 'copercar_inactivos_catalogo_conocidos_v1'
const emptyCache = () => ({ marcas: [], lineas: [] })
const readCache = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
    if (Array.isArray(parsed?.marcas) && Array.isArray(parsed?.lineas)) return parsed
  } catch { /* caché local inválida */ }
  return emptyCache()
}
const byName = (a, b) => a.nombre.localeCompare(b.nombre, 'es')
const normMarca = m => ({ id: Number(m.id_marca ?? m.id), nombre: String(m.nombre ?? m.name ?? ''), activo: (m.activo ?? m.active) !== false })
const normLinea = l => ({ id: Number(l.id_linea ?? l.id), idMarca: Number(l.id_marca ?? l.brandId ?? l.idMarca), nombre: String(l.nombre ?? l.name ?? ''), activo: (l.activo ?? l.active) !== false })
const friendlyError = e => e?.status === 404 || e?.status === 405
  ? 'La operación no está disponible en el servidor.'
  : e?.status === 409 || e?.status === 400
  ? 'No fue posible guardar el cambio. Verifica que el nombre no esté repetido y que no haya registros relacionados.'
  : e?.message && !e?.status ? e.message
  : 'No fue posible completar la operación. Inténtalo nuevamente.'

export default function BrandsLines() {
  const navigate = useNavigate()
  const [marcas, setMarcas] = useState([])
  const [lineas, setLineas] = useState([])
  const [conocidos, setConocidos] = useState(readCache)
  const [nombreMarca, setNombreMarca] = useState('')
  const [primeraLinea, setPrimeraLinea] = useState('')
  const [marcaElegida, setMarcaElegida] = useState('')
  const [nuevaLinea, setNuevaLinea] = useState('')
  const [editando, setEditando] = useState(null)
  const [nombreEditado, setNombreEditado] = useState('')
  const [confirmando, setConfirmando] = useState(null)
  const [activando, setActivando] = useState(null)
  const [lineaParaActivar, setLineaParaActivar] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [respaldo, setRespaldo] = useState(false)
  const [seccion, setSeccion] = useState('activas')

  useEffect(() => {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(conocidos)) }
    catch { /* almacenamiento no disponible: la sesión actual continúa */ }
  }, [conocidos])

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const data = await Promise.allSettled([catalogos.listarMarcas(), catalogos.listarLineas()])
      let m, l
      if (data.every(x => x.status === 'fulfilled')) {
        m = data[0].value
        l = data[1].value
        setRespaldo(false)
      } else {
        const response = await fetch('/catalogos/copercar.json', { cache: 'no-store' })
        if (!response.ok) throw new Error('No se pudo consultar el catálogo.')
        const db = await response.json()
        m = db.marcas || []
        l = db.lineas || []
        setRespaldo(true)
      }
      const marcasActivas = (Array.isArray(m) ? m : m?.items || []).map(normMarca).filter(x => x.activo)
      const lineasActivas = (Array.isArray(l) ? l : l?.items || []).map(normLinea).filter(x => x.activo)
      setMarcas(marcasActivas)
      setLineas(lineasActivas)
      // Si un elemento vuelve a estar activo según el backend, deja de aparecer
      // en la sección de inactivos locales.
      if (data.every(x => x.status === 'fulfilled')) {
        setConocidos(prev => ({
          marcas: prev.marcas.filter(x => !marcasActivas.some(marca => marca.id === x.id)),
          lineas: prev.lineas.filter(x => !lineasActivas.some(linea => linea.id === x.id)),
        }))
      }
    } catch { setError('No se pudo cargar el catálogo de marcas y líneas.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const run = async (action, success, afterSuccess) => {
    if (busy || respaldo) {
      if (respaldo) setError('No hay conexión con el catálogo del servidor. No se guardó ningún cambio.')
      return false
    }
    setError(''); setNotice(''); setBusy(true)
    try {
      await action()
      afterSuccess?.()
      await refresh()
      setNotice(success)
      return true
    } catch (e) { setError(friendlyError(e)); return false }
    finally { setBusy(false) }
  }

  const edit = (tipo, item) => {
    setError(''); setEditando({ tipo, item }); setNombreEditado(item.nombre)
  }
  const saveEdit = async e => {
    e.preventDefault()
    if (!nombreEditado.trim() || nombreEditado.trim().length < 2) {
      setError('Escribe un nombre de al menos dos caracteres.'); return
    }
    const { tipo, item } = editando
    const ok = await run(() => tipo === 'marca'
      ? catalogos.editarMarca(item.id, nombreEditado.trim())
      : catalogos.editarLinea(item.id, nombreEditado.trim()), 'Nombre actualizado correctamente.')
    if (ok) setEditando(null)
  }

  const deactivate = async () => {
    if (!confirmando) return
    const { tipo, item } = confirmando
    const related = tipo === 'marca' ? lineas.filter(x => x.idMarca === item.id) : []
    const brand = tipo === 'linea' ? marcas.find(m => m.id === item.idMarca) : null
    const ok = await run(() => tipo === 'marca'
      ? catalogos.eliminarMarca(item.id)
      : catalogos.eliminarLinea(item.id), `${tipo === 'marca' ? 'Marca' : 'Línea'} desactivada correctamente.`, () => {
      setConocidos(prev => ({
        marcas: tipo === 'marca'
          ? [...prev.marcas.filter(m => m.id !== item.id), { ...item, primeraLinea: related[0]?.nombre || '' }]
          : prev.marcas,
        lineas: tipo === 'marca'
          ? [...prev.lineas.filter(x => !related.some(l => l.id === x.id)), ...related.map(l => ({ ...l, nombreMarca: item.nombre }))]
          : [...prev.lineas.filter(l => l.id !== item.id), { ...item, nombreMarca: brand?.nombre || '' }],
      }))
    })
    if (ok) setConfirmando(null)
  }

  const activate = (tipo, item) => {
    setError(''); setActivando({ tipo, item })
    setLineaParaActivar(tipo === 'marca' ? (item.primeraLinea || conocidos.lineas.find(l => l.idMarca === item.id)?.nombre || '') : '')
  }
  const confirmActivate = async e => {
    e.preventDefault()
    if (!activando) return
    const { tipo, item } = activando
    let brandName, lineName
    if (tipo === 'marca') {
      brandName = item.nombre
      lineName = lineaParaActivar.trim()
      if (!lineName) { setError('Para reactivar la marca, indica una de sus líneas.'); return }
    } else {
      const parent = marcas.find(m => m.id === item.idMarca)
      if (!parent) { setError('Primero debes activar la marca a la que pertenece esta línea.'); return }
      brandName = parent.nombre
      lineName = item.nombre
    }
    // El POST real de Juan restaura marcas/líneas que ya existían inactivas.
    // La pantalla no anuncia éxito hasta que el servidor confirme la operación.
    const ok = await run(() => catalogos.crearMarcaConLinea(brandName, lineName), 'Registro activado correctamente.')
    if (ok) setActivando(null)
  }

  const marcasVisibles = useMemo(() => marcas.slice().sort(byName), [marcas])
  const marcasInactivas = useMemo(() => conocidos.marcas.slice().sort(byName), [conocidos.marcas])
  const lineasInactivas = useMemo(() => conocidos.lineas.slice().sort(byName), [conocidos.lineas])

  return <section className="page-section brands-lines-page">
    <PageTitle>Administrar marcas y líneas</PageTitle>
    <button type="button" className="btn btn-light" onClick={() => navigate('/vehiculos')}>Volver a vehículos</button>
    {notice && <div className="success-note" role="status">{notice}</div>}
    {error && <div className="form-error" role="alert">{error}</div>}
    {respaldo && <div className="form-error" role="alert">No se pudo consultar el servidor. Se muestran datos de referencia; las operaciones están deshabilitadas.</div>}

    <div className="catalog-navigation" role="tablist" aria-label="Estado de marcas y líneas">
      <button type="button" role="tab" id="catalog-tab-activas" aria-controls="catalog-panel-activas" aria-selected={seccion === 'activas'} className={`catalog-navigation-btn ${seccion === 'activas' ? 'selected' : ''}`} onClick={() => { setSeccion('activas'); setError(''); setNotice('') }}>Marcas y líneas activas</button>
      <button type="button" role="tab" id="catalog-tab-inactivas" aria-controls="catalog-panel-inactivas" aria-selected={seccion === 'inactivas'} className={`catalog-navigation-btn ${seccion === 'inactivas' ? 'selected' : ''}`} onClick={() => { setSeccion('inactivas'); setError(''); setNotice('') }}>Marcas y líneas inactivas</button>
    </div>

    {seccion === 'activas' && <div id="catalog-panel-activas" role="tabpanel" aria-labelledby="catalog-tab-activas">
    <div className="module-heading-row"><h2>Agregar marca con su primera línea</h2></div>
    <form className="user-form" onSubmit={async e => {
      e.preventDefault()
      if (!nombreMarca.trim() || !primeraLinea.trim()) { setError('Debes ingresar la marca y al menos una línea.'); return }
      await run(() => catalogos.crearMarcaConLinea(nombreMarca.trim(), primeraLinea.trim()), 'Marca y línea creadas correctamente.', () => { setNombreMarca(''); setPrimeraLinea('') })
    }}>
      <div className="user-form-grid"><label className="field"><span>Marca *</span><input required maxLength={50} value={nombreMarca} onChange={e => setNombreMarca(e.target.value)} /></label><label className="field"><span>Primera línea *</span><input required maxLength={50} value={primeraLinea} onChange={e => setPrimeraLinea(e.target.value)} /></label></div>
      <div className="form-actions"><button className="btn btn-green" disabled={busy || respaldo}>Crear marca y línea</button></div>
    </form>

    <div className="module-heading-row"><h2>Agregar línea a una marca existente</h2></div>
    <form className="user-form" onSubmit={async e => {
      e.preventDefault()
      if (!marcaElegida || !nuevaLinea.trim()) { setError('Selecciona una marca e ingresa el nombre de la línea.'); return }
      await run(() => catalogos.crearLinea(Number(marcaElegida), nuevaLinea.trim()), 'Línea creada correctamente.', () => { setNuevaLinea('') })
    }}>
      <div className="user-form-grid"><label className="field"><span>Marca *</span><select required value={marcaElegida} onChange={e => setMarcaElegida(e.target.value)}><option value="">Selecciona una marca</option>{marcasVisibles.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}</select></label><label className="field"><span>Nueva línea *</span><input required maxLength={50} value={nuevaLinea} onChange={e => setNuevaLinea(e.target.value)} /></label></div>
      <div className="form-actions"><button className="btn btn-green" disabled={busy || respaldo}>Agregar línea</button></div>
    </form>

    <div className="module-heading-row"><h2>Marcas y líneas activas</h2></div>
    {loading ? <p>Cargando marcas y líneas...</p> : !marcasVisibles.length ? <div className="empty-state">No hay marcas activas para mostrar.</div> : marcasVisibles.map(m => <div className="brand-manager-group" key={m.id}>
      <div className="brand-manager-line"><strong>{m.nombre}</strong><span className="estado-activo">Activo</span><button type="button" className="btn btn-light" disabled={busy || respaldo} onClick={() => edit('marca', m)}>Editar</button><button type="button" className="btn btn-light" disabled={busy || respaldo} onClick={() => { setError(''); setConfirmando({ tipo: 'marca', item: m }) }}>Desactivar</button></div>
      {lineas.filter(l => l.idMarca === m.id).sort(byName).map(l => <div className="brand-manager-line brand-manager-child" key={l.id}><span>{l.nombre}</span><span className="estado-activo">Activo</span><button type="button" className="btn btn-light" disabled={busy || respaldo} onClick={() => edit('linea', l)}>Editar</button><button type="button" className="btn btn-light" disabled={busy || respaldo} onClick={() => { setError(''); setConfirmando({ tipo: 'linea', item: l }) }}>Desactivar</button></div>)}
    </div>)}

    </div>}

    {seccion === 'inactivas' && <div id="catalog-panel-inactivas" role="tabpanel" aria-labelledby="catalog-tab-inactivas">
    <div className="module-heading-row"><h2>Marcas y líneas inactivas</h2></div>
    <p className="catalog-notice">Esta sección muestra los registros desactivados desde este navegador. Para consultar todos los inactivos de MySQL, Juan debe habilitar un listado que también los incluya.</p>
    {!marcasInactivas.length && !lineasInactivas.length && <div className="empty-state">No hay registros inactivos conocidos en este navegador.</div>}
    {marcasInactivas.map(m => <div className="brand-manager-group" key={`inactive-brand-${m.id}`}>
      <div className="brand-manager-line"><strong>{m.nombre}</strong><span className="estado-inactivo">Inactivo</span><button type="button" className="btn btn-green" disabled={busy || respaldo} onClick={() => activate('marca', m)}>Activar</button></div>
    </div>)}
    {lineasInactivas.map(l => <div className="brand-manager-group" key={`inactive-line-${l.id}`}>
      <div className="brand-manager-line"><span><strong>{l.nombre}</strong> <small className="catalog-parent-brand">— {marcas.find(m => m.id === l.idMarca)?.nombre || l.nombreMarca || 'Marca no disponible'}</small></span><span className="estado-inactivo">Inactivo</span><button type="button" className="btn btn-green" disabled={busy || respaldo || !marcas.some(m => m.id === l.idMarca)} title={!marcas.some(m => m.id === l.idMarca) ? 'Activa primero la marca' : 'Activar línea'} onClick={() => activate('linea', l)}>Activar</button></div>
    </div>)}

    </div>}

    <Modal open={!!editando} title={`Editar ${editando?.tipo === 'marca' ? 'marca' : 'línea'}`} onClose={() => { if (!busy) { setEditando(null); setError('') } }}>
      {editando && <form className="catalog-modal-form" onSubmit={saveEdit}>
        <label className="field"><span>Nombre *</span><input autoFocus required maxLength={100} minLength={2} value={nombreEditado} onChange={e => setNombreEditado(e.target.value)} /></label>
        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="modal-actions"><button type="button" className="btn btn-gray" disabled={busy} onClick={() => { setEditando(null); setError('') }}>Cancelar</button><button className="btn btn-green" disabled={busy || respaldo}>Guardar cambios</button></div>
      </form>}
    </Modal>
    <Modal open={!!confirmando} title="Confirmar desactivación" onClose={() => { if (!busy) { setConfirmando(null); setError('') } }}>
      <p>¿Deseas desactivar {confirmando?.tipo === 'marca' ? 'la marca' : 'la línea'} <strong>{confirmando?.item.nombre}</strong>?</p>
      {confirmando?.tipo === 'marca' && <p>Sus líneas también quedarán inactivas. No se eliminarán los registros históricos.</p>}
      {error && <div className="form-error" role="alert">{error}</div>}
      <div className="modal-actions"><button type="button" className="btn btn-gray" disabled={busy} onClick={() => { setConfirmando(null); setError('') }}>Cancelar</button><button type="button" className="btn btn-danger" disabled={busy || respaldo} onClick={deactivate}>Desactivar</button></div>
    </Modal>
    <Modal open={!!activando} title={`Activar ${activando?.tipo === 'marca' ? 'marca' : 'línea'}`} onClose={() => { if (!busy) { setActivando(null); setError('') } }}>
      {activando && <form className="catalog-modal-form" onSubmit={confirmActivate}>
        <p>Se solicitará al servidor reactivar <strong>{activando.item.nombre}</strong>. El cambio solo se mostrará como realizado si el servidor lo confirma.</p>
        {activando.tipo === 'marca' && <label className="field"><span>Primera línea que se reactivará *</span><input autoFocus required minLength={2} maxLength={100} value={lineaParaActivar} onChange={e => setLineaParaActivar(e.target.value)} /></label>}
        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="modal-actions"><button type="button" className="btn btn-gray" disabled={busy} onClick={() => { setActivando(null); setError('') }}>Cancelar</button><button className="btn btn-green" disabled={busy || respaldo}>Activar</button></div>
      </form>}
    </Modal>
  </section>
}

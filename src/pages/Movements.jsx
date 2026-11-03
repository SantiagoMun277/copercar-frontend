import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppData } from '../context/AppDataContext'
import Modal from '../components/Modal'
import PageTitle from '../components/PageTitle'
import Pagination from '../components/Pagination'
import { DeleteAction, EditAction } from '../components/ActionIcons'
import { MOVEMENT_TYPES } from '../services/backend'
import { formatCOP, formatDate } from '../utils/format'

const monthNames=['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
export default function Movements(){
 const {movements,deleteMovement,loadingMovements,movementError}=useAppData(); const navigate=useNavigate();
 const [deleting,setDeleting]=useState(false);
 const confirmDelete=async()=>{if(!toDelete||deleting)return;setDeleting(true);setDeleteError('');try{await deleteMovement(toDelete.id);setToDelete(null)}catch(e){setDeleteError(e.message||'No se pudo eliminar el movimiento.')}finally{setDeleting(false)}};
 const [query,setQuery]=useState(''); const [type,setType]=useState('Todos'); const [date,setDate]=useState(''); const [month,setMonth]=useState(''); const [year,setYear]=useState(''); const [page,setPage]=useState(1); const [toDelete,setToDelete]=useState(null); const [deleteError,setDeleteError]=useState(''); const perPage=7;
 const filtered=useMemo(()=>movements.filter(m=>{ if (m.deleted) return false;
  const d=new Date(m.date+'T00:00:00');
  return (!query||m.plate.toLowerCase().includes(query.toLowerCase())) && (type==='Todos'||m.type===type) && (!date||m.date===date) && (!month||d.getMonth()+1===Number(month)) && (!year||d.getFullYear()===Number(year));
 }).sort((a,b)=>Number(b.id)-Number(a.id)),[movements,query,type,date,month,year]);
 const totalPages=Math.max(1,Math.ceil(filtered.length/perPage)); const rows=filtered.slice((page-1)*perPage,page*perPage)
 const setFilter=(fn,val)=>{fn(val);setPage(1)}
 return <section className="page-section">
  <PageTitle>Movimientos</PageTitle>
  <div className="module-heading-row"><h1>Movimientos</h1></div>
  <div className="toolbar movement-toolbar">
   <label className="searchbox"><span>⌕</span><input placeholder="Buscar por placa" value={query} onChange={e=>setFilter(setQuery,e.target.value)}/></label>
   <label className="field compact no-top-label"><select value={type} onChange={e=>setFilter(setType,e.target.value)}><option>Todos</option>{MOVEMENT_TYPES.map(([label,id])=><option key={id} value={label}>{label}</option>)}</select></label>
   <label className="field compact no-top-label"><input type="date" value={date} onChange={e=>setFilter(setDate,e.target.value)}/></label>
   <label className="field compact no-top-label"><select value={month} onChange={e=>setFilter(setMonth,e.target.value)}><option value="">Mes</option>{monthNames.slice(1).map((x,i)=><option key={x} value={i+1}>{x}</option>)}</select></label>
   <label className="field compact no-top-label"><select value={year} onChange={e=>setFilter(setYear,e.target.value)}><option value="">Año</option>{[2023,2024,2025,2026].map(y=><option key={y}>{y}</option>)}</select></label>
   <button className="btn btn-green push-right" onClick={()=>navigate('/movimientos/nuevo')}>＋ Registrar movimiento</button>
  </div>
  {movementError&&<div className="form-error">{movementError}</div>}{loadingMovements&&<p>Cargando movimientos...</p>}
  <div className="responsive-table-wrap"><table className="data-table"><thead><tr><th>Placa</th><th>Vehículo</th><th>Tipo</th><th>Fecha</th><th>Valor</th><th>Usuario responsable</th><th>Acciones</th></tr></thead><tbody>{rows.map(m=><tr key={m.id}><td>{m.plate}</td><td>{m.vehicle}</td><td>{m.type}</td><td>{formatDate(m.date)}</td><td>{formatCOP(m.value)}</td><td>{m.user}</td><td className="table-actions"><EditAction onClick={()=>navigate(`/movimientos/${m.id}/editar`)}/><DeleteAction onClick={()=>{setDeleteError('');setToDelete(m)}}/></td></tr>)}</tbody></table></div>
  <Pagination page={page} totalPages={totalPages} onChange={setPage}/>
  <Modal open={!!toDelete} onClose={()=>setToDelete(null)}>
   <div className="warning-symbol">⚠</div><h2 className="center-title">Eliminar movimiento</h2><p className="modal-question centered">¿Está seguro de que desea eliminar este movimiento?</p>
   {toDelete&&<div className="detail-list"><span>Vehículo:</span><b>{toDelete.vehicle}</b><span>Placa:</span><b>{toDelete.plate}</b><span>Tipo de movimiento:</span><b>{toDelete.type}</b><span>Fecha:</span><b>{formatDate(toDelete.date)}</b><span>Valor:</span><b>{formatCOP(toDelete.value)}</b></div>}
   {deleteError && <div className="form-error">{deleteError}</div>}
   <div className="modal-actions centered"><button className="btn btn-danger" onClick={confirmDelete} disabled={deleting}>Sí</button><button className="btn btn-gray" onClick={()=>setToDelete(null)}>No</button></div>
  </Modal>
 </section>
}

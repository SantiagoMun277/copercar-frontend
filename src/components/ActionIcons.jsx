export function EditAction({ onClick, label='Editar' }) {
  return <button className="icon-action" onClick={onClick}><img src="/assets/ui/icon-edit.png" alt="" />{label}</button>
}
export function DeleteAction({ onClick, label='Eliminar' }) {
  return <button className="icon-action" onClick={onClick}><img src="/assets/ui/icon-delete.png" alt="" />{label}</button>
}

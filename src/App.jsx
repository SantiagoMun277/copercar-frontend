import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import Login from './pages/Login'
import Vehicles from './pages/Vehicles'
import BrandsLines from './pages/BrandsLines'
import VehicleForm from './pages/VehicleForm'
import Movements from './pages/Movements'
import MovementForm from './pages/MovementForm'
import Reports from './pages/Reports'
import Users from './pages/Users'
import UserForm from './pages/UserForm'
import MyData from './pages/MyData'
import AppLayout from './components/AppLayout'
import ProtectedRoute from './components/ProtectedRoute'

const UserEditRedirect = () => { const {id} = useParams(); return <Navigate to="/usuarios" replace state={{editUserId:Number(id)}}/> }

const Guard = ({ roles, children }) => <ProtectedRoute roles={roles}>{children}</ProtectedRoute>

export default function App(){
  return <Routes>
    <Route path="/login" element={<Login/>}/>
    <Route element={<Guard><AppLayout/></Guard>}>
      <Route index element={<Navigate to="/vehiculos" replace/>}/>
      <Route path="/vehiculos" element={<Vehicles/>}/>
      <Route path="/vehiculos/marcas-lineas" element={<Guard roles={['admin']}><BrandsLines/></Guard>}/>
      <Route path="/vehiculos/nuevo" element={<VehicleForm/>}/>
      <Route path="/vehiculos/:id/editar" element={<VehicleForm/>}/>
      <Route path="/movimientos" element={<Guard roles={['admin']}><Movements/></Guard>}/>
      <Route path="/movimientos/nuevo" element={<Guard roles={['admin']}><MovementForm/></Guard>}/>
      <Route path="/movimientos/:id/editar" element={<Guard roles={['admin']}><MovementForm/></Guard>}/>
      <Route path="/mis-datos" element={<MyData/>}/>
      <Route path="/reportes" element={<Guard roles={['admin']}><Reports/></Guard>}/>
      <Route path="/usuarios" element={<Guard roles={['admin']}><Users/></Guard>}/>
      <Route path="/usuarios/nuevo" element={<Guard roles={['admin']}><UserForm/></Guard>}/>
      <Route path="/usuarios/:id/editar" element={<Guard roles={['admin']}><UserEditRedirect/></Guard>}/>
    </Route>
    <Route path="*" element={<Navigate to="/vehiculos" replace/>}/>
  </Routes>
}

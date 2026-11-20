import { Routes, Route } from 'react-router-dom'
import { rotasPublicas } from './rotasPublicas/rotasPublicas'
import { rotasPrivadas } from './rotasPrivadas/rotasPrivadas'
import NaoEncontrada from '../paginas/NaoEncontrada/NaoEncontrada'

export default function Rotas() {
  return (
    <Routes>
      {/* 1. Suas Rotas Públicas */}
      {rotasPublicas}

      {/* 2. Suas Rotas Privadas */}
      {rotasPrivadas}

      {/* 3. Endereço que não existe: página 404 */}
      <Route path="*" element={<NaoEncontrada />} />
    </Routes>
  )
}

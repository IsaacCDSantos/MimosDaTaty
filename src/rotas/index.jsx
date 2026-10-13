import { Routes, Route, Navigate } from 'react-router-dom'
import { rotasPublicas } from './rotasPublicas/rotasPublicas'
import { rotasPrivadas } from './rotasPrivadas/rotasPrivadas'

export default function Rotas() {
  return (
    <Routes>
      {/* 1. Suas Rotas Públicas */}
      {rotasPublicas}

      {/* 2. Suas Rotas Privadas */}
      {rotasPrivadas}

      {/* 3. Se digitar um endereço que não existe, volta para o Início */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

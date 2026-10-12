import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { UploadPage } from './pages/UploadPage'
import { DashboardPage } from './pages/DashboardPage'
import { NotFoundPage } from './pages/NotFoundPage'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<UploadPage />} />
        <Route path="d/:id" element={<DashboardPage />}>
          <Route index element={<Navigate to="summary" replace />} />
          <Route path="summary" element={<DashboardPage />} />
          <Route path="preview" element={<DashboardPage />} />
          <Route path="columns" element={<DashboardPage />} />
          <Route path="charts" element={<DashboardPage />} />
          <Route path="builder" element={<DashboardPage />} />
          <Route path="export" element={<DashboardPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

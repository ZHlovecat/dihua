import React, { useEffect } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import MainLayout from './layout/MainLayout'
import AboutPage from './pages/About'
import ConfirmPage from './pages/Confirm'
import EntriesPage from './pages/Entries'
import GeneralPage from './pages/General'
import HistoryPage from './pages/History'
import TargetsPage from './pages/Targets'

export default function App(): React.JSX.Element {
  const navigate = useNavigate()
  useEffect(() => window.dihua.app.onNav((route) => navigate(route)), [navigate])

  return (
    <Routes>
      <Route path="/confirm/:jobId" element={<ConfirmPage />} />
      <Route element={<MainLayout />}>
        <Route path="/general" element={<GeneralPage />} />
        <Route path="/entries" element={<EntriesPage />} />
        <Route path="/targets" element={<TargetsPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/about" element={<AboutPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/history" replace />} />
    </Routes>
  )
}

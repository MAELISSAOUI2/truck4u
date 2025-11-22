'use client';

import { useState, useEffect } from 'react';

interface DashboardStats {
  drivers: {
    total: number;
    active: number;
    pending: number;
  };
  customers: {
    total: number;
  };
  rides: {
    total: number;
    today: number;
    active: number;
    completedToday: number;
  };
  revenue: {
    total: number;
  };
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/stats/overview`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Chargement...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-gray-600">Vue d'ensemble de la plateforme</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Drivers */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-3xl">🚛</div>
            <div className="text-right">
              <div className="text-2xl font-bold">{stats?.drivers.total || 0}</div>
              <div className="text-sm text-gray-600">Conducteurs</div>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            <span className="text-green-600 font-medium">{stats?.drivers.active || 0}</span> actifs,{' '}
            <span className="text-yellow-600 font-medium">{stats?.drivers.pending || 0}</span> en attente
          </div>
        </div>

        {/* Total Customers */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-3xl">👥</div>
            <div className="text-right">
              <div className="text-2xl font-bold">{stats?.customers.total || 0}</div>
              <div className="text-sm text-gray-600">Clients</div>
            </div>
          </div>
          <div className="text-sm text-gray-600">Total des utilisateurs</div>
        </div>

        {/* Today Rides */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-3xl">📦</div>
            <div className="text-right">
              <div className="text-2xl font-bold">{stats?.rides.today || 0}</div>
              <div className="text-sm text-gray-600">Courses aujourd'hui</div>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            <span className="text-blue-600 font-medium">{stats?.rides.active || 0}</span> en cours,{' '}
            <span className="text-green-600 font-medium">{stats?.rides.completedToday || 0}</span> terminées
          </div>
        </div>

        {/* Revenue */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-3xl">💰</div>
            <div className="text-right">
              <div className="text-2xl font-bold">{(stats?.revenue.total || 0).toFixed(2)} TND</div>
              <div className="text-sm text-gray-600">Revenu total</div>
            </div>
          </div>
          <div className="text-sm text-gray-600">Commission plateforme</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Actions rapides</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/admin/kyc"
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <div className="text-2xl">✓</div>
            <div>
              <div className="font-medium">Vérifier KYC</div>
              <div className="text-sm text-gray-600">{stats?.drivers.pending || 0} en attente</div>
            </div>
          </a>

          <a
            href="/admin/drivers"
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <div className="text-2xl">🚛</div>
            <div>
              <div className="font-medium">Gérer conducteurs</div>
              <div className="text-sm text-gray-600">Voir tous les conducteurs</div>
            </div>
          </a>

          <a
            href="/admin/rides"
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <div className="text-2xl">📦</div>
            <div>
              <div className="font-medium">Courses actives</div>
              <div className="text-sm text-gray-600">{stats?.rides.active || 0} en cours</div>
            </div>
          </a>
        </div>
      </div>

      {/* Recent Activity (Placeholder) */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Activité récente</h2>
        <div className="text-center py-8 text-gray-500">
          <p>Aucune activité récente à afficher</p>
        </div>
      </div>
    </div>
  );
}

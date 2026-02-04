/**
 * useFleetData Hook
 * Manages fleet data fetching with fallback to mock data
 */

import { useState, useEffect, useCallback } from 'react';
import { fleetAPI } from '../services/api';
import { shipperDashboardData } from '../data/mockDashboard';
import type { Fleet } from '../types/dashboard';

export interface UseFleetDataOptions {
  useMockData?: boolean;
}

export interface UseFleetDataState {
  fleets: Fleet[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  getFleetEI: (fleetId: string) => Promise<any>;
}

export function useFleetData(options: UseFleetDataOptions = {}): UseFleetDataState {
  const { useMockData = import.meta.env.VITE_ENABLE_MOCK_DATA === 'true' } = options;

  const [fleets, setFleets] = useState<Fleet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch fleet data
  const fetchFleetData = useCallback(async () => {
    if (useMockData) {
      // Use mock data
      setFleets(shipperDashboardData.fleets);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch public fleets from API
      const publicFleets = await fleetAPI.getPublicFleets(50);

      // Convert to Fleet type
      const convertedFleets: Fleet[] = publicFleets.map((fleet) => ({
        id: fleet.fleetId,
        vehicleType: fleet.fleetName,
        carbonIntensity: fleet.eiCurrent,
        grade: (fleet.eiGrade || 'GRADE_2') as any,
        owner: fleet.carrierName,
        price: 0, // Not available from public API
      }));

      setFleets(convertedFleets);
    } catch (err) {
      console.error('Failed to fetch fleet data, falling back to mock data:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      // Fallback to mock data
      setFleets(shipperDashboardData.fleets);
    } finally {
      setLoading(false);
    }
  }, [useMockData]);

  // Get detailed fleet EI data
  const getFleetEI = useCallback(
    async (fleetId: string) => {
      if (useMockData) {
        // Return mock fleet with EI data
        const fleet = shipperDashboardData.fleets.find((f) => f.id === fleetId);
        return {
          fleetId,
          eiCurrent: fleet?.carbonIntensity || 150,
          eiGrade: fleet?.grade || 'GRADE_2',
          ei30DayAverage: (fleet?.carbonIntensity || 150) + 2.5,
          trend: [
            { date: '2024-02-01', ei: (fleet?.carbonIntensity || 150) + 5, grade: 'GRADE_2' },
            { date: '2024-02-02', ei: (fleet?.carbonIntensity || 150) + 3, grade: 'GRADE_2' },
            { date: '2024-02-03', ei: (fleet?.carbonIntensity || 150) + 1, grade: 'GRADE_1' },
            { date: '2024-02-04', ei: fleet?.carbonIntensity || 150, grade: 'GRADE_1' },
          ],
        };
      }

      try {
        const fleetEI = await fleetAPI.getFleetEI(fleetId);
        return fleetEI;
      } catch (err) {
        console.error('Failed to fetch fleet EI data:', err);
        throw err;
      }
    },
    [useMockData]
  );

  // Refresh fleet data
  const refresh = useCallback(async () => {
    await fetchFleetData();
  }, [fetchFleetData]);

  // Auto-fetch on mount
  useEffect(() => {
    fetchFleetData();
  }, [fetchFleetData]);

  return {
    fleets,
    loading,
    error,
    refresh,
    getFleetEI,
  };
}

export default useFleetData;

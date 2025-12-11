import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import {
  getGovernorateFromCoordinates,
  getCommissionRate,
  getCommissionRateFromCoordinates,
  getAllGovernorateCommissions,
} from '../../src/services/governorate';

const prisma = new PrismaClient();

describe('Governorate Service', () => {
  beforeAll(async () => {
    // Clean existing commissions
    await prisma.governorateCommission.deleteMany({});

    // Create test commissions
    await prisma.governorateCommission.createMany({
      data: [
        { governorate: 'Tunis', commissionRate: 0.08, isActive: true },
        { governorate: 'Sfax', commissionRate: 0.09, isActive: true },
        { governorate: 'Tataouine', commissionRate: 0.05, isActive: true },
        { governorate: 'Ariana', commissionRate: 0.10, isActive: false }, // Inactive
      ],
    });
  });

  afterAll(async () => {
    await prisma.governorateCommission.deleteMany({});
    await prisma.$disconnect();
  });

  describe('getGovernorateFromCoordinates', () => {
    it('should identify Tunis from coordinates', () => {
      const result = getGovernorateFromCoordinates(36.8065, 10.1815);
      expect(result).toBe('Tunis');
    });

    it('should identify Sfax from coordinates', () => {
      const result = getGovernorateFromCoordinates(34.7406, 10.7603);
      expect(result).toBe('Sfax');
    });

    it('should identify Ariana from coordinates', () => {
      const result = getGovernorateFromCoordinates(36.8625, 10.1956);
      expect(result).toBe('Ariana');
    });

    it('should identify Nabeul from coordinates', () => {
      const result = getGovernorateFromCoordinates(36.4561, 10.7376);
      expect(result).toBe('Nabeul');
    });

    it('should identify Tataouine from coordinates (southern region)', () => {
      const result = getGovernorateFromCoordinates(32.9297, 10.4517);
      expect(result).toBe('Tataouine');
    });

    it('should identify Tozeur from coordinates (western region)', () => {
      const result = getGovernorateFromCoordinates(33.9197, 8.1338);
      expect(result).toBe('Tozeur');
    });

    it('should find nearest governorate for coordinates between regions', () => {
      // Coordinates between Tunis and Ariana
      const result = getGovernorateFromCoordinates(36.83, 10.18);
      expect(['Tunis', 'Ariana']).toContain(result);
    });

    it('should handle edge cases (coastal areas)', () => {
      const result = getGovernorateFromCoordinates(35.8256, 10.6369); // Sousse
      expect(result).toBe('Sousse');
    });
  });

  describe('getCommissionRate', () => {
    it('should return custom commission rate for Tunis', async () => {
      const rate = await getCommissionRate('Tunis');
      expect(rate).toBe(0.08);
    });

    it('should return custom commission rate for Sfax', async () => {
      const rate = await getCommissionRate('Sfax');
      expect(rate).toBe(0.09);
    });

    it('should return custom commission rate for Tataouine', async () => {
      const rate = await getCommissionRate('Tataouine');
      expect(rate).toBe(0.05);
    });

    it('should return default rate (10%) for governorate without custom rate', async () => {
      const rate = await getCommissionRate('Kairouan');
      expect(rate).toBe(0.10);
    });

    it('should ignore inactive commissions', async () => {
      // Ariana has inactive commission, should return default
      const rate = await getCommissionRate('Ariana');
      expect(rate).toBe(0.10);
    });

    it('should return default rate for non-existent governorate', async () => {
      const rate = await getCommissionRate('NonExistent');
      expect(rate).toBe(0.10);
    });
  });

  describe('getCommissionRateFromCoordinates', () => {
    it('should detect governorate and return custom rate', async () => {
      const result = await getCommissionRateFromCoordinates(36.8065, 10.1815);
      expect(result.governorate).toBe('Tunis');
      expect(result.rate).toBe(0.08);
    });

    it('should detect governorate and return default rate if no custom rate', async () => {
      const result = await getCommissionRateFromCoordinates(35.6781, 10.0967); // Kairouan
      expect(result.governorate).toBe('Kairouan');
      expect(result.rate).toBe(0.10);
    });

    it('should work for southern regions', async () => {
      const result = await getCommissionRateFromCoordinates(32.9297, 10.4517); // Tataouine
      expect(result.governorate).toBe('Tataouine');
      expect(result.rate).toBe(0.05);
    });
  });

  describe('getAllGovernorateCommissions', () => {
    it('should return all 24 Tunisian governorates', async () => {
      const commissions = await getAllGovernorateCommissions();
      expect(commissions).toHaveLength(24);
    });

    it('should include custom rates for configured governorates', async () => {
      const commissions = await getAllGovernorateCommissions();

      const tunis = commissions.find((c) => c.governorate === 'Tunis');
      expect(tunis?.commissionRate).toBe(0.08);
      expect(tunis?.hasCustomRate).toBe(true);

      const sfax = commissions.find((c) => c.governorate === 'Sfax');
      expect(sfax?.commissionRate).toBe(0.09);
      expect(sfax?.hasCustomRate).toBe(true);
    });

    it('should return default rate for governorates without custom rate', async () => {
      const commissions = await getAllGovernorateCommissions();

      const kairouan = commissions.find((c) => c.governorate === 'Kairouan');
      expect(kairouan?.commissionRate).toBe(0.10);
      expect(kairouan?.hasCustomRate).toBe(false);
    });

    it('should include all major governorates', async () => {
      const commissions = await getAllGovernorateCommissions();
      const names = commissions.map((c) => c.governorate);

      // Check presence of major governorates
      expect(names).toContain('Tunis');
      expect(names).toContain('Ariana');
      expect(names).toContain('Sfax');
      expect(names).toContain('Sousse');
      expect(names).toContain('Nabeul');
      expect(names).toContain('Bizerte');
      expect(names).toContain('Gabès');
      expect(names).toContain('Médenine');
      expect(names).toContain('Tataouine');
      expect(names).toContain('Tozeur');
    });

    it('should sort governorates alphabetically', async () => {
      const commissions = await getAllGovernorateCommissions();
      const names = commissions.map((c) => c.governorate);

      // Check that names are sorted
      const sortedNames = [...names].sort();
      expect(names).toEqual(sortedNames);
    });
  });

  describe('Commission Rate Scenarios', () => {
    it('should support dynamic pricing strategies', async () => {
      // Dense urban areas - lower commission to attract drivers
      const tunis = await getCommissionRateFromCoordinates(36.8065, 10.1815);
      expect(tunis.rate).toBeLessThan(0.10);

      // Remote areas - even lower commission
      const tataouine = await getCommissionRateFromCoordinates(32.9297, 10.4517);
      expect(tataouine.rate).toBeLessThanOrEqual(tunis.rate);
    });

    it('should calculate platform fees correctly', async () => {
      const ridePrice = 100; // 100 DT

      // Tunis (8%)
      const tunisResult = await getCommissionRateFromCoordinates(36.8065, 10.1815);
      const tunisFee = ridePrice * tunisResult.rate;
      expect(tunisFee).toBe(8);

      // Default region (10%)
      const defaultResult = await getCommissionRateFromCoordinates(35.6781, 10.0967);
      const defaultFee = ridePrice * defaultResult.rate;
      expect(defaultFee).toBe(10);

      // Tataouine (5%)
      const tataouineResult = await getCommissionRateFromCoordinates(32.9297, 10.4517);
      const tataouineFee = ridePrice * tataouineResult.rate;
      expect(tataouineFee).toBe(5);
    });
  });

  describe('Edge Cases', () => {
    it('should handle coordinates at governorate borders', async () => {
      // Border between Tunis and Ben Arous
      const result1 = await getCommissionRateFromCoordinates(36.77, 10.20);
      expect(['Tunis', 'Ben Arous']).toContain(result1.governorate);

      // Result should be deterministic for same coordinates
      const result2 = await getCommissionRateFromCoordinates(36.77, 10.20);
      expect(result2.governorate).toBe(result1.governorate);
    });

    it('should handle extreme coordinates gracefully', async () => {
      // Far northern Tunisia
      const north = await getCommissionRateFromCoordinates(37.5, 10.0);
      expect(north.governorate).toBeTruthy();
      expect(north.rate).toBeGreaterThan(0);

      // Far southern Tunisia
      const south = await getCommissionRateFromCoordinates(32.0, 10.0);
      expect(south.governorate).toBeTruthy();
      expect(south.rate).toBeGreaterThan(0);
    });
  });
});

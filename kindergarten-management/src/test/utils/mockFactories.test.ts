import { describe, it, expect } from 'vitest';
import {
  createMockFinanceConfig,
  createMockFee,
  createMockClass,
  createMockDeductionRule,
  TEST_FINANCE_CONFIGS,
  TEST_CLASSES,
} from './mockFactories';

describe('mockFactories', () => {
  describe('createMockFinanceConfig', () => {
    it('creates default Daycare finance config', () => {
      const config = createMockFinanceConfig();
      
      expect(config.class_type).toBe('Daycare');
      expect(config.class_id).toBeNull();
      expect(config.deduction_rules).toHaveLength(2);
      expect(config.deduction_rules[0].name).toBe('Tiền cơm');
      expect(config.del_yn).toBe(false);
    });

    it('applies overrides correctly', () => {
      const config = createMockFinanceConfig({
        id: 99,
        class_type: 'Evening',
        deduction_rules: [{ id: '5', name: 'Custom', amount: 100000 }],
      });
      
      expect(config.id).toBe(99);
      expect(config.class_type).toBe('Evening');
      expect(config.deduction_rules).toHaveLength(1);
      expect(config.deduction_rules[0].name).toBe('Custom');
    });
  });

  describe('createMockFee', () => {
    it('creates default fee record', () => {
      const fee = createMockFee();
      
      expect(fee.student_name).toBe('Nguyễn Văn A');
      expect(fee.class_name).toBe('Mầm 1');
      expect(fee.amount_vnd).toBe(2000000);
      expect(fee.status).toBe('unpaid');
      expect(fee.base_amount_vnd).toBe(2000000);
    });

    it('applies overrides correctly', () => {
      const fee = createMockFee({
        id: 'custom-fee',
        amount_vnd: 1500000,
        status: 'paid',
      });
      
      expect(fee.id).toBe('custom-fee');
      expect(fee.amount_vnd).toBe(1500000);
      expect(fee.status).toBe('paid');
    });
  });

  describe('createMockClass', () => {
    it('creates default Daycare class', () => {
      const classRecord = createMockClass();
      
      expect(classRecord.name).toBe('Mầm 1');
      expect(classRecord.class_type).toBe('Daycare');
      expect(classRecord.teacher_name).toBe('Cô Lan');
      expect(classRecord.max_students).toBe(20);
    });

    it('applies overrides correctly', () => {
      const classRecord = createMockClass({
        id: 5,
        name: 'Tối 2',
        class_type: 'Evening',
      });
      
      expect(classRecord.id).toBe(5);
      expect(classRecord.name).toBe('Tối 2');
      expect(classRecord.class_type).toBe('Evening');
    });
  });

  describe('createMockDeductionRule', () => {
    it('creates default deduction rule', () => {
      const rule = createMockDeductionRule();
      
      expect(rule.id).toBe('1');
      expect(rule.name).toBe('Tiền cơm');
      expect(rule.amount).toBe(50000);
    });

    it('applies overrides correctly', () => {
      const rule = createMockDeductionRule({
        id: '10',
        name: 'Tiền xe',
        amount: 200000,
      });
      
      expect(rule.id).toBe('10');
      expect(rule.name).toBe('Tiền xe');
      expect(rule.amount).toBe(200000);
    });
  });

  describe('TEST_FINANCE_CONFIGS', () => {
    it('has daycare config with Vietnamese fields', () => {
      const { daycare } = TEST_FINANCE_CONFIGS;
      
      expect(daycare.class_type).toBe('Daycare');
      expect(daycare.deduction_rules).toHaveLength(2);
      expect(daycare.deduction_rules[0].name).toBe('Tiền cơm');
      expect(daycare.deduction_rules[1].name).toBe('Tiền ăn sáng');
    });

    it('has evening config with Vietnamese fields', () => {
      const { evening } = TEST_FINANCE_CONFIGS;
      
      expect(evening.class_type).toBe('Evening');
      expect(evening.deduction_rules).toHaveLength(1);
      expect(evening.deduction_rules[0].name).toBe('Tiền cơm tối');
    });
  });

  describe('TEST_CLASSES', () => {
    it('has daycare1 class with Vietnamese fields', () => {
      const { daycare1 } = TEST_CLASSES;
      
      expect(daycare1.name).toBe('Mầm 1');
      expect(daycare1.class_type).toBe('Daycare');
      expect(daycare1.teacher_name).toBe('Cô Lan');
      expect(daycare1.description).toBe('Lớp mầm non ban ngày');
    });

    it('has evening1 class with Vietnamese fields', () => {
      const { evening1 } = TEST_CLASSES;
      
      expect(evening1.name).toBe('Tối 1');
      expect(evening1.class_type).toBe('Evening');
      expect(evening1.teacher_name).toBe('Cô Hoa');
      expect(evening1.description).toBe('Lớp học buổi tối');
    });
  });
});

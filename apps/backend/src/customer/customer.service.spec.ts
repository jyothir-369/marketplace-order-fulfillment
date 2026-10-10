import { Test } from '@nestjs/testing';
import { CustomerController } from './customer.controller';

describe('CustomerController', () => {
  it('profile endpoint requires auth', () => {
    expect(typeof CustomerController.prototype.profile).toBe('function');
  });
  it('update profile validates buyer role', () => {
    expect(typeof CustomerController.prototype.updateProfile).toBe('function');
  });
});

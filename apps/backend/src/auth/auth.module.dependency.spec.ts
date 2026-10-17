import { Global, Module } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { AuthModule } from './auth.module';
import { AuthService } from './auth.service';
import { EmailService } from '../common/email/email.service';
import { User } from '../common/entities/user.entity';
import { RefreshToken } from '../common/entities/refresh-token.entity';
import { PasswordResetToken } from '../common/entities/password-reset-token.entity';

const mockRepo = {
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn(),
  create: jest.fn((value: unknown) => value),
  delete: jest.fn(),
  update: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockDataSource = {
  manager: {
    transaction: jest.fn(async (callback: (manager: any) => unknown) =>
      callback({
        getRepository: jest.fn(() => mockRepo),
      }),
    ),
  },
};

@Global()
@Module({
  providers: [{ provide: DataSource, useValue: mockDataSource }],
  exports: [DataSource],
})
class MockTypeOrmCoreModule {}

describe('AuthModule dependency injection regression', () => {
  let testingModule: TestingModule;

  beforeAll(async () => {
    testingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        MockTypeOrmCoreModule,
        AuthModule,
      ],
    })
      .overrideProvider(getRepositoryToken(User))
      .useValue(mockRepo)
      .overrideProvider(getRepositoryToken(RefreshToken))
      .useValue(mockRepo)
      .overrideProvider(getRepositoryToken(PasswordResetToken))
      .useValue(mockRepo)
      .compile();
  });

  afterAll(async () => {
    await testingModule?.close();
  });

  it('resolves AuthService and the EmailService class/string tokens', () => {
    const authService = testingModule.get<AuthService>(AuthService);
    const emailServiceByClass = testingModule.get<EmailService>(EmailService);
    const emailServiceByString = testingModule.get<EmailService>('EmailService');

    expect(authService).toBeDefined();
    expect(emailServiceByClass).toBeInstanceOf(EmailService);
    expect(emailServiceByString).toBe(emailServiceByClass);
    expect(typeof emailServiceByString.sendResetLink).toBe('function');
  });

  it('aliases DATA_SOURCE to the injected TypeORM DataSource instance', () => {
    const dataSource = testingModule.get<DataSource>('DATA_SOURCE');

    expect(dataSource).toBe(mockDataSource);
    expect(typeof dataSource.manager.transaction).toBe('function');
    expect(typeof dataSource).not.toBe('function');
  });
});

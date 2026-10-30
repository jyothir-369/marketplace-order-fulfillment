import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../common/entities/user.entity';

export interface UpdateProfileDto {
  displayName?: string;
  bio?: string | null;
}

@Injectable()
export class CustomerService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async profile(userId: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return user;
  }

  async update(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<User> {
    if (dto.bio != null && dto.bio.length > 280) {
      throw new BadRequestException('Bio must not exceed 280 characters');
    }

    const user = await this.profile(userId);

    if (dto.displayName !== undefined) {
      user.displayName = dto.displayName;
    }

    if (dto.bio !== undefined) {
      user.bio = dto.bio;
    }

    const savedUser = await this.usersRepository.save(user);

    // Some unit-test repository mocks do not return a value from save().
    return savedUser ?? user;
  }
}


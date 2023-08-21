import { Module } from '@nestjs/common';
import { NestRmq } from './nest-rmq.service';

@Module({
  providers: [NestRmq],
  exports: [NestRmq],
})
export class NestRmqModule {}

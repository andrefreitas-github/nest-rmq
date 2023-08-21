import { Options } from 'amqplib';

export interface IQueueObject {
  name: string;
  handler: any;
  routingKey?: string;
  queueOptions?: Options.AssertQueue;
}

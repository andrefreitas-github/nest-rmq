import { Options } from "amqplib";

interface IQueueObject {
  name: string;
  routingKey?: string;
  queueOptions?: Options.AssertQueue;
}
export interface IConsumeQueueObject extends IQueueObject {
  handler: any;
}

export interface IPublisherQueueObject extends IQueueObject {}

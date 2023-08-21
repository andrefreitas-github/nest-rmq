import { Channel, ConfirmChannel } from 'amqplib';

export interface IQueueCommand {
  deliveryTag?: string;
  ack(): Promise<unknown>;
  channel?: Channel | ConfirmChannel;
}

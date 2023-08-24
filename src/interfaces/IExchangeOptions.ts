import { Options } from 'amqplib';
import { IConsumeQueueObject, IPublisherQueueObject } from './IQueueObject';

export interface PublisherExchangeOptions {
  name: string;
  queueList: IPublisherQueueObject[];
}

export interface ConsumerExchangeOptions {
    name: string;
    queueList: IConsumeQueueObject[];
  }

export interface IExchangeOptions {
    name: string;
    channelType?: 'channel' | 'confirmChannel';
    type?: 'direct' | 'topic' | 'headers' | 'fanout' | 'match';
    options?: Options.AssertExchange;
    exchangeList: ConsumerExchangeOptions[];
  }
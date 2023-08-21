import { Options } from 'amqplib';
import { IQueueObject } from './IQueueObject';

export interface ConsumerExchangeOptions {
    name: string;
    queueList: IQueueObject[];
  }

export interface IExchangeOptions {
    name: string;
    channelType?: 'channel' | 'confirmChannel';
    type?: 'direct' | 'topic' | 'headers' | 'fanout' | 'match';
    options?: Options.AssertExchange;
    exchangeList: ConsumerExchangeOptions[];
  }
import { ConsumerExchangeOptions } from './IExchangeOptions';

export interface IConsumerOptions {
  channelPrefetchCount?: number;
  autoACK: boolean;
  exchangeList: ConsumerExchangeOptions[];
}

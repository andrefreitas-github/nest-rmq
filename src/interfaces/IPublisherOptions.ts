import { ConsumerExchangeOptions } from "./IExchangeOptions";

export interface IPublisherOptions {
    channelType?: 'channel' | 'confirmChannel';
    exchangeList: ConsumerExchangeOptions[];
  }
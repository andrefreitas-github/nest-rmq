import { PublisherExchangeOptions } from "./IExchangeOptions";

export interface IPublisherOptions {
    channelType?: 'channel' | 'confirmChannel';
    exchangeList: PublisherExchangeOptions[];
  }
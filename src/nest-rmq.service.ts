import { Injectable } from "@nestjs/common";
import {
  CustomTransportStrategy,
  MessageHandler,
  Server,
} from "@nestjs/microservices";
import { Channel, ConfirmChannel, Connection, Options, connect } from "amqplib";
import {
  IConsumerOptions,
  IExchangeOptions,
  IPublisherOptions,
  IQueueCommand,
} from "./interfaces";

@Injectable()
export class NestRmq extends Server implements CustomTransportStrategy {
  protected static publisherChannel: Channel | ConfirmChannel;
  protected messageHandlerList: Map<string, MessageHandler<any, any, any>>;
  protected connection: Connection;
  protected connectionUrl: string;

  constructor(url: string) {
    super();
    this.connectionUrl = url;
  }

  private async connect() {
    try {
      this.connection = await connect(this.connectionUrl);
      console.info("RabbitMQ Custom Strategy connected 😀");
    } catch (error) {
      console.error(`Connection problems :( ===> Errors: ${error}`);
    }
  }

  /**
   * Creates a channel type for Exchanges and Queues communications
   * @param channelType Channel | ConfirmChannel
   * @returns Channel | ConfirmChannel
   */
  private async createChannel({ channelType }: IPublisherOptions) {
    if (channelType === "confirmChannel") {
      return await this.connection.createConfirmChannel();
    } else {
      return await this.connection.createChannel();
    }
  }

  /**
   * This method is triggered when you run "app.listen()".
   */
  async listen(callback: () => void) {
    await this.connect();
    this.messageHandlerList = this.messageHandlers;
    callback();
  }

  /**
   * Configure exchanges associated to an channel
   * @param queueProperties
   */
  async exchangeConfig({
    exchangeList,
    channelType,
    type,
    options,
  }: IExchangeOptions) {
    /** creates publisher channel */
    const channel = await this.createChannel({ channelType, exchangeList });

    for (const { name } of exchangeList) {
      await channel.assertExchange(name, type, options);
    }
  }

  async publisherConfig({ exchangeList, channelType }: IPublisherOptions) {
    /** creates publisher channel */
    NestRmq.publisherChannel = await this.createChannel({
      exchangeList,
      channelType,
    });

    for (const exchange of exchangeList) {
      for (const queueProps of exchange.queueList) {
        await NestRmq.publisherChannel
          .assertQueue(queueProps.name, queueProps.queueOptions)
          .then(() => {
            return NestRmq.publisherChannel.bindQueue(
              queueProps.name,
              exchange.name,
              queueProps.name
            );
          });
      }
    }
  }

  /**
   *
   * @param exchange Exchange to be used on delivery message
   * @param data Data to be delivery
   * @param routingKey Routing key used to delivery message accross message broker
   * @param options Message options ref:: RabbitMQ options
   */
  static async publish(
    exchange: string,
    data: any,
    routingKey?: string,
    options?: Options.Publish
  ) {
    NestRmq.publisherChannel.publish(
      exchange,
      routingKey,
      Buffer.from(data),
      options
    );
  }

  /**
   * Configure consumer channels, exchanges and queues
   * @param consumeQueues
   * @returns
   */
  async consumerConfig({
    exchangeList,
    channelPrefetchCount,
    autoACK,
  }: IConsumerOptions): Promise<void> {
    const channel: Channel | ConfirmChannel = await this.createChannel({
      exchangeList,
    });

    for (const exchange of exchangeList) {
      for (const queueProps of exchange.queueList) {
        /** creates consumer channel */
        channelPrefetchCount && (await channel.prefetch(channelPrefetchCount));

        const consumer = async (msg) => {
          try {
            const fn = await this.messageHandlerList?.get(queueProps.handler);

            if (!fn) channel.reject(msg, true);

            const qCommand: IQueueCommand = {
              channel,
              async ack() {
                await channel.ack(msg);
              },
            };

            fn(msg, qCommand);
          } catch (err) {
            channel.reject(msg, true);
            console.log(err);
          }
        };

        await channel.consume(queueProps.name, consumer, { noAck: autoACK });
      }
    }
  }
  /**
   * This method is triggered on application shutdown.
   */
  async close() {
    await this.connection?.close();
  }
}

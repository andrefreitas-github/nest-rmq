import { Injectable, Logger } from "@nestjs/common";
import {
  CustomTransportStrategy,
  MessageHandler,
  Server,
} from "@nestjs/microservices";
import {
  Channel,
  ConfirmChannel,
  Connection,
  Message,
  Options,
  Replies,
  connect,
} from "amqplib";
import {
  IConsumerOptions,
  IExchangeOptions,
  IPublisherOptions,
} from "./interfaces";
import { ConnectionError } from "./exceptions/connection-error";
import { PublishMessageException } from "./exceptions/message-exception";

export type IQueueCommand = {
  deliveryTag?: string;
  ack(): Promise<unknown>;
  reject(requeue?: boolean): Promise<unknown>;
  channel?: Channel | ConfirmChannel;
};

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
      Logger.log("RabbitMQ Custom Strategy connected 😀", "NestRmqConnect");
    } catch (error) {
      throw new ConnectionError(this.connectionUrl);
    }
  }

  /**
   * Creates a channel type for Exchanges and Queues communications
   * @param channelType Channel | ConfirmChannel
   * @returns Channel | ConfirmChannel
   */
  private async createChannel({
    channelType,
  }: IPublisherOptions): Promise<Channel | ConfirmChannel> {
    if (channelType === "confirmChannel") {
      Logger.debug("Creating confirmChannel", "NestRmqCreateChannel");
      return await this.connection.createConfirmChannel();
    } else {
      Logger.debug("Creating channel", "NestRmqCreateChannel");
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
    const channel: Channel | ConfirmChannel = await this.createChannel({
      channelType,
      exchangeList,
    });

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

  private static toBuffer(data: Buffer | string | object) {
    /** stringfied data */
    if (typeof data === "string") {
      return Buffer.from(data);
    }

    /** transform to stringfied data */
    if (typeof data === "object") {
      return Buffer.from(JSON.stringify(data));
    }

    return data;
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
    data: Buffer | string | object,
    routingKey?: string,
    options?: Options.Publish
  ): Promise<void> {
    const dataBuffer = this.toBuffer(data);

    NestRmq.publisherChannel.publish(
      exchange,
      routingKey,
      dataBuffer,
      options,
      (err, ok) => {
        if (err) {
          Logger.error(
            `An error occured to publish message ${JSON.stringify(err)}`,
            "NestRmqPublish"
          );
          throw new PublishMessageException(err);
        }

        return ok;
      }
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
    const channel: Channel = await this.createChannel({
      exchangeList,
    });

    for (const exchange of exchangeList) {
      for (const queueProps of exchange.queueList) {
        /** creates consumer channel */
        channelPrefetchCount && (await channel.prefetch(channelPrefetchCount));

        /** Check Queue existence */
        await channel
          .assertQueue(queueProps.name)
          .then((qProps: Replies.AssertQueue) => {
            Logger.log(
              `Queue ${qProps.queue} has ${qProps.messageCount} messages to consume with ${qProps.consumerCount} consumers`,
              "NestRmqConsumerConfig"
            );
          })
          .catch(Logger.error);

        const consumer = async (msg: Message) => {
          try {
            Logger.debug(`{debug} Message consumed ${JSON.stringify(msg)}`);

            const fn = await this.messageHandlerList?.get(queueProps.handler);

            if (!fn) {
              Logger.warn(
                `The message ${JSON.stringify(
                  msg
                )} has no handlers (annotations on controllers) configured on NestJS.`
              );
              channel.reject(msg, true);
            }

            const qCommand: IQueueCommand = {
              channel,
              async ack(): Promise<void> {
                Logger.debug(`Message acknowledged ${JSON.stringify(msg)}`);
                await channel.ack(msg);
              },
              async reject(requeue = false): Promise<void> {
                Logger.debug(`Message rejected ${JSON.stringify(msg)}`);
                await channel.reject(msg, requeue);
              },
            };

            fn(msg, qCommand);
          } catch (err) {
            channel.reject(msg, true);
            Logger.error(err);
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
    Logger.warn("Closing Connection", "NestRmqClose");
    await this.connection?.close();
  }
}

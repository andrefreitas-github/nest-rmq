# Nest Rmq

The `nest-rmq` project provides astraction and custom strategy for consumming messages from RabbitMQ using NestJS.

This library creates one connection per instance,creating channel for publish and creating a channel for consumming messages. 
The publisher can send messages across a routingKey or a specific queue.
You can configure publisher, consumer or both of them.
At this time, this lib is not prepared to configure exchanges and bind queues. Just publish and consume existing exchanges and queues and binders.  

## Sample

This example shows both configuration (assuming that you created the exchange and queues).

In the main.ts archive

```js

(main.ts)

// import the package
import { NestRmq } from 'nest-rmq';

	async function bootstrap() {
	  const app = await NestFactory.create(AppModule);

	  //created the rabbitMQ instance
	  const rabbitMQInstance = new NestRmq('amqp://localhost');

	  // connects to Microservice custom strategy
	  await app
		.connectMicroservice<MicroserviceOptions>({
		  strategy: rabbitMQInstance,
		})
		.listen();

	  // configure the publisher to send messages
	  rabbitMQInstance.publisherConfig({
		channelType: 'confirmChannel',
		exchangeList: [
		  {
			name: 'exchange',
			queueList: [
			  {
				name: 'queue_name',
				handler: 'queue_shoes',
				routingKey: 'queue_name',
				queueOptions: {
				  durable: true,
				},
			  },
			  {
				name: 'queue_names',
				handler: 'queue_names',
				routingKey: 'queue_names',
				queueOptions: {
				  durable: true,
				},
			  },
			],
		  },
		],
	  });

	  //configure the consumer 
	  rabbitMQInstance.consumerConfig({
		autoACK: false,
		channelPrefetchCount: 1,
		exchangeList: [
		  {
			name: 'exchange',
			queueList: [
			  {
				name: 'queueX',
				handler: 'queue_shoes',
				routingKey: 'queue_name',
				queueOptions: {
				  durable: true,
				},
			  },
			  {
				name: 'queueY',
				handler: 'queue_names',
				routingKey: 'queue_name',
				queueOptions: {
				  durable: true,
				},
			  },
			],
		  },
		],
	  });

	  await app.listen(3000);
	}
	
	bootstrap();

```

In the controller.ts archive

```js

(controller.ts)

// import the package
import { NestRmq } from 'nest-rmq';

	import { Controller, Get } from '@nestjs/common';
	import { Ctx, MessagePattern, Payload } from '@nestjs/microservices';
	import { NestRmq, QueueCommmand } from 'nest-rmq';

	@Controller()
	export class AppController {
	  private queue_shoes: number = 0;
	  private queue_namesC: number = 0;

	  @Get()
	  async publisher(): Promise<string> {
		
		// exchange - data - queue or routingKey - messageOptions
		NestRmq.publish('exchange',JSON.stringify({ test: 'test' }),'queue_name',
		  {
			persistent: true,
		  },
		);

		return 'published message example';
	  }

	  @MessagePattern('queue_names')
	  async queue_names(@Payload() data: object, @Ctx() qCmd: IQueueCommand) {
	    
		// acknowledge to referenced message
		await qCmd.ack();
	
	  }

	  @MessagePattern('queue_shoes')
	  async echoShoes(@Payload() data: object, @Ctx() qCmd: IQueueCommand) {
	  
		// acknowledge to referenced message
		await qCmd.ack();
	  }
	}


```
export class PublishMessageException extends Error {
  public readonly name = "ConnectionFailed";
  public readonly message: string;

  public constructor(error) {
    super(`Unable to publish message ${error}`);
  }
}

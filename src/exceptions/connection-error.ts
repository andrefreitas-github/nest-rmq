export class ConnectionError extends Error {
  public readonly name = "ConnectionFailed";
  public readonly message: string;

  public constructor(url: string) {
    super();
    this.message = `Unable to connect ${url}`;
  }
}

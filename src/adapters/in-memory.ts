import { launch, connect, Implementation, Remote, MessageEndpoint } from '..';

export async function connectLocal<T>(handler: Implementation<T>): Promise<Remote<T>> {
  let [one, two] = endpointPair();
  launch(one, handler);
  return connect<T>(two);
}

export function endpointPair(): [MessageEndpoint, MessageEndpoint] {
  let one = new InMemoryEndpoint();
  let two = new InMemoryEndpoint();

  one.connect(two);
  two.connect(one);

  return [one, two];
}

class InMemoryEndpoint implements MessageEndpoint {
  public other?: InMemoryEndpoint;
  private listeners: Function[] = [];

  public connect(other: InMemoryEndpoint) {
    this.other = other;
  }

  public onMessage(callback: (message: unknown) => void): void {
    this.listeners.push(callback);
  }

  public sendMessage(message: unknown): void {
    if (this.other) {
      this.other.dispatchMessage(message);
    }
  }

  public disconnect(): void {
    this.other = undefined;
    this.listeners = [];
  }

  public dispatchMessage(message: unknown) {
    for (let listener of this.listeners) {
      listener(message);
    }
  }
}

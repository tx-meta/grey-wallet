/**
 * Base Payment Request Model
 * Base class for all M-Pesa payment requests
 */

export abstract class PaymentRequest {
  protected amount: number;
  protected partyA: number;
  protected partyB: number;

  constructor({
    partyA,
    partyB,
    amount,
  }: {
    partyA: number;
    partyB: number;
    amount: number;
  }) {
    this.amount = amount;
    this.partyA = partyA;
    this.partyB = partyB;
  }

  /**
   * Convert the object to PascalCase as required by Daraja API
   */
  toPascalCase(): Record<string, any> {
    return {
      Amount: this.amount,
      PartyA: this.partyA,
      PartyB: this.partyB,
    };
  }
}

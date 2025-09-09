/**
 * STK Push Payment Request Model
 * For customer-initiated payments (buy crypto)
 */

export interface STKPushRequestParams {
  businessShortCode: string;
  password: string;
  timestamp: string;
  transactionType: string;
  amount: number;
  partyA: string;
  partyB: string;
  phoneNumber: string;
  callBackURL: string;
  accountReference: string;
  transactionDesc: string;
}

export class STKPushRequest {
  private businessShortCode: string;
  private password: string;
  private timestamp: string;
  private transactionType: string;
  private amount: number;
  private partyA: string;
  private partyB: string;
  private phoneNumber: string;
  private callBackURL: string;
  private accountReference: string;
  private transactionDesc: string;

  constructor({
    businessShortCode,
    password,
    timestamp,
    transactionType,
    amount,
    partyA,
    partyB,
    phoneNumber,
    callBackURL,
    accountReference,
    transactionDesc,
  }: STKPushRequestParams) {
    this.businessShortCode = businessShortCode;
    this.password = password;
    this.timestamp = timestamp;
    this.transactionType = transactionType;
    this.amount = amount;
    this.partyA = partyA;
    this.partyB = partyB;
    this.phoneNumber = phoneNumber;
    this.callBackURL = callBackURL;
    this.accountReference = accountReference;
    this.transactionDesc = transactionDesc;
  }

  toPascalCase(): Record<string, any> {
    return {
      BusinessShortCode: this.businessShortCode,
      Password: this.password,
      Timestamp: this.timestamp,
      TransactionType: this.transactionType,
      Amount: this.amount,
      PartyA: this.partyA,
      PartyB: this.partyB,
      PhoneNumber: this.phoneNumber,
      CallBackURL: this.callBackURL,
      AccountReference: this.accountReference,
      TransactionDesc: this.transactionDesc,
    };
  }
}

/**
 * B2C Payment Request Model
 * For business-to-customer payments (e.g., disbursements)
 */

import { PaymentRequest } from './payment-request';

export interface B2CPaymentRequestParams {
  amount: number;
  partyA: number;
  partyB: number;
  originatorConversationID: string;
  initiatorName: string;
  securityCredential: string;
  commandID: string;
  remarks: string;
  queueTimeOutURL: string;
  resultURL: string;
  occasion: string;
}

export class B2CPaymentRequest extends PaymentRequest {
  private originatorConversationID: string;
  private initiatorName: string;
  private securityCredential: string;
  private commandID: string;
  private remarks: string;
  private queueTimeOutURL: string;
  private resultURL: string;
  private occasion: string;

  constructor({
    amount,
    partyA,
    partyB,
    originatorConversationID,
    initiatorName,
    securityCredential,
    commandID,
    remarks,
    queueTimeOutURL,
    resultURL,
    occasion,
  }: B2CPaymentRequestParams) {
    super({
      amount,
      partyA,
      partyB,
    });

    this.originatorConversationID = originatorConversationID;
    this.initiatorName = initiatorName;
    this.securityCredential = securityCredential;
    this.commandID = commandID;
    this.remarks = remarks;
    this.queueTimeOutURL = queueTimeOutURL;
    this.resultURL = resultURL;
    this.occasion = occasion;
  }

  override toPascalCase(): Record<string, any> {
    const proto = super.toPascalCase();
    
    return {
      ...proto,
      OriginatorConversationID: this.originatorConversationID,
      InitiatorName: this.initiatorName,
      SecurityCredential: this.securityCredential,
      CommandID: this.commandID,
      Remarks: this.remarks,
      QueueTimeOutURL: this.queueTimeOutURL,
      ResultURL: this.resultURL,
      Occasion: this.occasion,
    };
  }
}

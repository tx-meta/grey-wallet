/**
 * B2B Payment Request Model
 * For business-to-business payments (e.g., paybill payments)
 */

import { PaymentRequest } from './payment-request';
import config from '../../../../shared/config';

export interface B2BPaymentRequestParams {
  amount: number;
  partyB: number;
  accountReference: number;
  requester: number;
  method: 'paybill' | 'buygoods';
  remarks: string;
}

export class B2BPaymentRequest extends PaymentRequest {
  private accountReference: number;
  private initiator: string;
  private securityCredential: string;
  private commandID: string;
  private senderIdentifierType: number;
  private receiverIdentifierType: number;
  private requester: number;
  private remarks: string;
  private queueTimeOutURL: string;
  private resultURL: string;

  constructor({
    amount,
    partyB,
    accountReference,
    requester,
    method,
    remarks,
  }: B2BPaymentRequestParams) {
    super({
      amount,
      partyA: Number.parseInt(config.mpesa.b2bPartyA),
      partyB: Number.parseInt(partyB.toString()),
    });

    this.accountReference = Number.parseInt(accountReference.toString());
    this.initiator = config.mpesa.b2bInitiatorName;
    this.securityCredential = config.mpesa.securityCredential;
    this.commandID = method === 'paybill' ? 'BusinessPayBill' : 'BusinessBuyGoods';
    this.senderIdentifierType = Number.parseInt(config.mpesa.b2bSenderIdentifierType);
    this.receiverIdentifierType = Number.parseInt(config.mpesa.b2bReceiverIdentifierType);
    this.requester = Number.parseInt(requester.toString());
    this.remarks = remarks;
    this.queueTimeOutURL = config.mpesa.b2bTimeoutUrl;
    this.resultURL = config.mpesa.b2bResultUrl;
  }

  override toPascalCase(): Record<string, any> {
    const proto = super.toPascalCase();
    
    return {
      ...proto,
      Initiator: this.initiator,
      SecurityCredential: this.securityCredential,
      CommandID: this.commandID,
      SenderIdentifierType: this.senderIdentifierType,
      ReceiverIdentifierType: this.receiverIdentifierType,
      Requester: this.requester,
      Remarks: this.remarks,
      QueueTimeOutURL: this.queueTimeOutURL,
      ResultURL: this.resultURL,
      AccountReference: this.accountReference,
    };
  }
}

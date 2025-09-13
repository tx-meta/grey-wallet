/**
 * B2B Payment Request Model
 * For business-to-business payments (e.g., paybill payments)
 */

import { PaymentRequest } from './payment-request';
import config from '../../../../shared/config';
import dotenv from 'dotenv';

// Load environment variables as a fallback
dotenv.config();

export interface B2BPaymentRequestParams {
  amount: number;
  partyB: number;
  accountReference: string; // Should be string, not number
  method: 'paybill' | 'buygoods' | 'pochi';
  remarks: string;
}

export class B2BPaymentRequest extends PaymentRequest {
  private accountReference: string;
  private initiator: string;
  private securityCredential: string;
  private commandID: string;
  private senderIdentifierType: number;
  private receiverIdentifierType: number;
  private remarks: string;
  private queueTimeOutURL: string;
  private resultURL: string;

  constructor({
    amount,
    partyB,
    accountReference,
    method,
    remarks,
  }: B2BPaymentRequestParams) {
    super({
      amount,
      partyA: Number.parseInt(config.mpesa?.b2bPartyA || process.env['DARAJA_B2B_PARTY_A'] || ''),
      partyB: Number.parseInt(partyB.toString()),
    });

    this.accountReference = accountReference; // Keep as string
    this.initiator = config.mpesa?.b2bInitiatorName || process.env['DARAJA_B2B_INITIATOR_NAME'] || '';
    this.securityCredential = config.mpesa?.securityCredential || process.env['DARAJA_SECURITY_CREDENTIAL'] || '';
    this.commandID = method === 'paybill' ? 'BusinessPayBill' : 'BusinessBuyGoods';
    // For B2B payments, sender is organization (4) and receiver depends on method
    this.senderIdentifierType = 4; // Organization
    // Set ReceiverIdentifierType based on method:
    // 1 = MSISDN (phone number), 2 = Till Number, 4 = Organization Short Code
    if (method === 'paybill') {
      this.receiverIdentifierType = 4; // Organization Short Code for paybill
    } else if (method === 'pochi') {
      this.receiverIdentifierType = 1; // MSISDN for phone numbers
    } else {
      this.receiverIdentifierType = 2; // Till Number for buygoods/till
    }
    this.remarks = remarks;
    this.queueTimeOutURL = config.mpesa?.b2bTimeoutUrl || process.env['DARAJA_B2B_QUEUE_TIMEOUT_URL'] || '';
    this.resultURL = config.mpesa?.b2bResultUrl || process.env['DARAJA_B2B_RESULT_URL'] || '';
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
      Remarks: this.remarks,
      QueueTimeOutURL: this.queueTimeOutURL,
      ResultURL: this.resultURL,
      AccountReference: this.accountReference,
    };
  }
}

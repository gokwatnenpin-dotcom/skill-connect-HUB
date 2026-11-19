import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverDirectory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(serverDirectory, '..', '.env') });
dotenv.config({ path: path.join(serverDirectory, '..', '..', '.env'), override: false });

export const env = {
  port: Number(process.env.PORT || 5000),
  clientUrl: (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/+$/, ''),
  paystackFeePercent: Number(process.env.PAYSTACK_FEE_PERCENT || 10),
  disputeMonthlyLimit: Number(process.env.DISPUTE_MONTHLY_LIMIT || 2),
  appealDays: Number(process.env.APPEAL_DAYS || 7),
  autoReleaseHours: Number(process.env.AUTO_RELEASE_HOURS || 48),
  newCustomerMaxOrderAmount: Number(process.env.NEW_CUSTOMER_MAX_ORDER_AMOUNT || 100000),
  newCustomerMaxOpenOrders: Number(process.env.NEW_CUSTOMER_MAX_OPEN_ORDERS || 2),
  raisedCustomerMaxOpenOrders: Number(process.env.RAISED_CUSTOMER_MAX_OPEN_ORDERS || 10),
  twoStrikeMaxOrderAmount: Number(process.env.TWO_STRIKE_MAX_ORDER_AMOUNT || 50000),
  completedOrdersToRaiseLimit: Number(process.env.COMPLETED_ORDERS_TO_RAISE_LIMIT || 3),
  raisedCustomerMaxOrderAmount: Number(process.env.RAISED_CUSTOMER_MAX_ORDER_AMOUNT || 1000000),
  phoneVerificationMode: process.env.PHONE_VERIFICATION_MODE || 'disabled',
  phoneVerificationCodeTtlMinutes: Number(process.env.PHONE_VERIFICATION_CODE_TTL_MINUTES || 10),
};

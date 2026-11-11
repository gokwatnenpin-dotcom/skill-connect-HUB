import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverDirectory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(serverDirectory, '..', '.env') });
dotenv.config({ path: path.join(serverDirectory, '..', '..', '.env'), override: false });

export const env = {
  port: Number(process.env.PORT || 5000),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  paystackFeePercent: Number(process.env.PAYSTACK_FEE_PERCENT || 10),
};

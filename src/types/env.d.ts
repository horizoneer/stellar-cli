declare global {
  namespace NodeJS {
    interface ProcessEnv {
      HORIZON_MAINNET_URL?: string;
      HORIZON_TESTNET_URL?: string;
    }
  }
}

export {};

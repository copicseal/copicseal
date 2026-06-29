/// <reference types="vite/client" />

interface NavigatorUAData {
  readonly brands: ReadonlyArray<{
    brand: string;
    version: string;
  }>;
  readonly mobile: boolean;
  readonly platform: string;
}

interface Navigator {
  readonly userAgentData?: NavigatorUAData;
}

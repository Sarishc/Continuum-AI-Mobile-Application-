// Global type declarations for modules without proper types

declare module '@react-native-async-storage/async-storage' {
  import AsyncStorage from '@react-native-async-storage/async-storage/lib/typescript/AsyncStorage';
  export default AsyncStorage;
}

declare module 'react-native-purchases' {
  export interface PurchasesPackage {
    identifier: string;
    packageType: string;
    product: {
      identifier: string;
      description: string;
      title: string;
      price: number;
      priceString: string;
      currencyCode: string;
    };
    offeringIdentifier: string;
  }

  export interface PurchasesOffering {
    identifier: string;
    serverDescription: string;
    availablePackages: PurchasesPackage[];
    monthly: PurchasesOffering | null;
    annual: PurchasesOffering | null;
    lifetime: PurchasesOffering | null;
  }

  export interface PurchasesOfferings {
    current: PurchasesOffering | null;
    all: Record<string, PurchasesOffering>;
  }

  export interface CustomerInfo {
    entitlements: {
      active: Record<string, EntitlementInfo>;
      all: Record<string, EntitlementInfo>;
    };
    activeSubscriptions: string[];
    allPurchasedProductIdentifiers: string[];
    latestExpirationDate: string | null;
    firstSeen: string;
    originalAppUserId: string;
  }

  export interface EntitlementInfo {
    identifier: string;
    isActive: boolean;
    willRenew: boolean;
    periodType: string;
    latestPurchaseDate: string;
    originalPurchaseDate: string;
    expirationDate: string | null;
    store: string;
    productIdentifier: string;
    isSandbox: boolean;
    unsubscribeDetectedAt: string | null;
    billingIssueDetectedAt: string | null;
  }

  const Purchases: {
    configure(options: { apiKey: string; appUserID?: string }): void;
    getOfferings(): Promise<PurchasesOfferings>;
    purchasePackage(pkg: PurchasesPackage): Promise<{ customerInfo: CustomerInfo }>;
    restorePurchases(): Promise<CustomerInfo>;
    getCustomerInfo(): Promise<CustomerInfo>;
    logIn(userId: string): Promise<{ customerInfo: CustomerInfo; created: boolean }>;
    logOut(): Promise<CustomerInfo>;
  };

  export default Purchases;
}

declare module 'expo-clipboard' {
  export function setStringAsync(text: string): Promise<void>;
  export function getStringAsync(): Promise<string>;
  export function setString(text: string): void;
}

declare module 'expo-sharing' {
  export function isAvailableAsync(): Promise<boolean>;
  export function shareAsync(url: string, options?: { mimeType?: string; dialogTitle?: string; UTI?: string }): Promise<void>;
}

declare module 'react-native-view-shot' {
  import { Component, RefObject } from 'react';
  import { ViewProps } from 'react-native';

  interface ViewShotOptions {
    format?: 'png' | 'jpg' | 'webm' | 'raw';
    quality?: number;
    result?: 'tmpfile' | 'base64' | 'data-uri' | 'zip-base64';
    width?: number;
    height?: number;
  }

  interface ViewShotProps extends ViewProps {
    options?: ViewShotOptions;
    captureMode?: 'explicit' | 'mount' | 'continuous' | 'update';
    onCapture?: (uri: string) => void;
    onCaptureFailure?: (error: Error) => void;
  }

  export default class ViewShot extends Component<ViewShotProps> {
    capture(): Promise<string>;
  }

  export function captureRef(ref: RefObject<any>, options?: ViewShotOptions): Promise<string>;
  export function captureScreen(options?: ViewShotOptions): Promise<string>;
  export function releaseCapture(uri: string): void;
}

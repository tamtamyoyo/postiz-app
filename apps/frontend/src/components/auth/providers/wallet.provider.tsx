'use client';

import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ConnectionProvider,
  useWallet,
  WalletProvider as WalletProviderWrapper,
} from '@solana/wallet-adapter-react';
import { useWalletMultiButton } from '@solana/wallet-adapter-base-ui';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
  LedgerWalletAdapter,
  TrustWalletAdapter,
  MathWalletAdapter,
  Coin98WalletAdapter,
  TokenPocketWalletAdapter,
} from '@solana/wallet-adapter-wallets';

import {
  WalletModalProvider,
  useWalletModal,
} from '@solana/wallet-adapter-react-ui';

import { clusterApiUrl } from '@solana/web3.js';

// Default styles that can be overridden by your app
import '@solana/wallet-adapter-react-ui/styles.css';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { WalletUiProvider } from '@gitroom/frontend/components/auth/providers/placeholder/wallet.ui.provider';

const WalletProvider = () => {
  const gotoLogin = useCallback(async (code: string) => {
    window.location.href = `/auth?provider=FARCASTER&code=${code}`;
  }, []);

  return <ButtonCaster login={gotoLogin} />;
};

export const ButtonCaster: FC<{ login: (code: string) => void }> = (props) => {
  const network = WalletAdapterNetwork.Mainnet;

  // You can also provide a custom RPC endpoint.
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new TorusWalletAdapter(),
      new LedgerWalletAdapter(),
      new TrustWalletAdapter(),
      new MathWalletAdapter(),
      new Coin98WalletAdapter(),
      new TokenPocketWalletAdapter(),
    ],
    [network]
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProviderWrapper wallets={wallets} autoConnect={false}>
        <WalletModalProvider>
          <DisabledAutoConnect />
        </WalletModalProvider>
      </WalletProviderWrapper>
    </ConnectionProvider>
  );
};

const DisabledAutoConnect = () => {
  const [connect, setConnect] = useState(false);
  const wallet = useWallet();

  const toConnect = useCallback(async () => {
    try {
      wallet.select(null);
    } catch (err) {
      /** empty */
    }

    try {
      await wallet.disconnect();
    } catch (err) {
      /** empty */
    }
    setConnect(true);
  }, []);

  useEffect(() => {
    toConnect();
  }, []);

  if (connect) {
    return <InnerWallet />;
  }

  return <WalletUiProvider />;
};

const InnerWallet = () => {
  const walletModal = useWalletModal();
  const wallet = useWallet();
  const fetch = useFetch();
  const { buttonState } = useWalletMultiButton({
    onSelectWallet: () => {
      return;
    },
  });

  const connect = useCallback(async () => {
    if (buttonState !== 'connected') {
      return;
    }

    try {
      const challenge = await (
        await fetch(
          `/auth/oauth/WALLET?publicKey=${wallet?.publicKey?.toString()}`
        )
      ).text();

      const encoded = new TextEncoder().encode(challenge);
      const signed = await wallet?.signMessage?.(encoded)!;

      const info = Buffer.from(
        JSON.stringify({
          // @ts-ignore
          signature: Buffer.from(signed).toString('hex'),
          challenge,
          publicKey: wallet?.publicKey?.toString(),
        })
      ).toString('base64');

      window.location.href = `/auth?provider=WALLET&code=${info}`;
    } catch (err) {
      walletModal.setVisible(false);
      wallet.select(null);
      wallet.disconnect().catch(() => {
        /** empty */
      });
    }
  }, [wallet, buttonState]);

  useEffect(() => {
    if (buttonState === 'has-wallet') {
      wallet
        .connect()
        .then(() => {
          /** empty */
        })
        .catch(() => {
          wallet.select(null);
          wallet.disconnect();
        });
    }

    if (buttonState === 'connected') {
      connect();
    }
  }, [buttonState]);

  return (
    <div onClick={() => walletModal.setVisible(true)}>
      <WalletUiProvider />
    </div>
  );
};
export default WalletProvider;

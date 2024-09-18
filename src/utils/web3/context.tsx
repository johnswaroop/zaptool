import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import Web3Modal from "web3modal";
import * as UAuthWeb3Modal from "@uauth/web3modal";
import { Web3Provider } from "@ethersproject/providers";
import { ChainIds, availableChains } from "./chains";
import { clearLocalItems, getLocalItem, setLocalItem } from "../helper";

type Web3ContextType = {
  connect: (targetChain?: ChainIds) => Promise<Web3Provider | undefined>;
  disconnect: () => Promise<void>;
  provider: Web3Provider | null;
  connected: boolean;
  address: string;
  chainId: ChainIds;
  web3Modal: Web3Modal | null;
  hasCachedProvider: () => boolean;
  switchChain: (targetChain: ChainIds) => Promise<boolean>;
};

const Web3Context = createContext<{ onChainProvider: Web3ContextType } | null>(
  null
);

export const useWeb3Context = () => {
  const web3Context = useContext(Web3Context);
  if (!web3Context)
    throw new Error("useWeb3Context must be used within a Web3Provider");
  const { onChainProvider } = web3Context;
  return useMemo(() => {
    return { ...onChainProvider };
  }, [onChainProvider]);
};

type Web3ContextProviderProps = {
  children: ReactNode;
};

export const Web3ContextProvider = ({ children }: Web3ContextProviderProps) => {
  const [connected, setConnected] = useState<boolean>(false);
  const [chainId, setChainId] = useState<ChainIds>(ChainIds.Ethereum);
  const [address, setAddress] = useState<string>("");
  const [provider, setProvider] = useState<Web3Provider | null>(null);
  const [web3Modal, setWeb3Modal] = useState<Web3Modal | null>(null); // Initialize with null

  // Only instantiate Web3Modal client-side
  useEffect(() => {
    if (typeof window !== "undefined") {
      const web3ModalInstance = new Web3Modal({
        cacheProvider: true,
        providerOptions: {
          connector: { package: UAuthWeb3Modal, ...UAuthWeb3Modal },
        },
      });
      setWeb3Modal(web3ModalInstance);
      UAuthWeb3Modal.registerWeb3Modal(web3ModalInstance);
    }
  }, []);

  const hasCachedProvider = useCallback((): boolean => {
    return !!web3Modal?.cachedProvider;
  }, [web3Modal]);

  const disconnect = useCallback(async () => {
    if (web3Modal) {
      web3Modal.clearCachedProvider();
    }
    clearLocalItems();
    if (connected) setTimeout(() => window.location.reload(), 1);
  }, [connected, web3Modal]);

  const _initListeners = useCallback(
    (rawProvider: any) => {
      if (!rawProvider.on) {
        return;
      }
      rawProvider.on("accountsChanged", () => {
        setTimeout(() => window.location.reload(), 1);
      });

      rawProvider.on("chainChanged", async (chain: string | number) => {
        let newChainId: number;
        if (typeof chain === "number") {
          newChainId = chain;
        } else {
          newChainId = parseInt(chain, 16);
        }
        if (!Object.keys(availableChains).includes("" + newChainId)) {
          setProvider(null);
          disconnect();
        } else {
          connect(newChainId as ChainIds);
        }
      });

      rawProvider.on("network", (_newNetwork: any, oldNetwork: any) => {
        if (!oldNetwork) return;
        window.location.reload();
      });
    },
    [disconnect]
  );

  const switchChain = useCallback(
    async (targetChain: ChainIds): Promise<boolean> => {
      const chainId = "0x" + targetChain.toString(16);
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId }],
        });
        return true;
      } catch (e: any) {
        if (e.code === 4902) {
          try {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId,
                  chainName: availableChains[targetChain].chainName,
                  nativeCurrency: {
                    symbol: availableChains[targetChain].symbol,
                    decimals: availableChains[targetChain].decimals,
                  },
                  blockExplorerUrls:
                    availableChains[targetChain].blockExplorerUrls,
                  rpcUrls: availableChains[targetChain].rpcUrls,
                },
              ],
            });
            return true;
          } catch (addError) {
            console.error(addError);
            return false;
          }
        } else {
          console.error(e);
          return false;
        }
      }
    },
    []
  );

  const connect = useCallback(
    async (
      targetChain: ChainIds = ChainIds.Ethereum
    ): Promise<Web3Provider | undefined> => {
      if (!web3Modal) return; // Ensure web3Modal exists before trying to use it

      if (!Object.keys(availableChains).includes("" + targetChain)) {
        web3Modal.clearCachedProvider();
        const switched = await switchChain(ChainIds.Ethereum);
        if (!switched) {
          console.error(
            "Unable to connect. Please change network using provider."
          );
          return;
        }
      }

      let rawProvider = await web3Modal.connect();
      _initListeners(rawProvider);
      let connectedProvider = new Web3Provider(rawProvider, "any");

      let connectedChainId = await connectedProvider
        .getNetwork()
        .then((network) =>
          typeof network.chainId === "number"
            ? network.chainId
            : parseInt(network.chainId, 16)
        );

      if (connectedChainId !== targetChain) {
        web3Modal.clearCachedProvider();
        const switched = await switchChain(targetChain);
        if (!switched) {
          console.error(
            "Unable to connect. Please change network using provider."
          );
          return;
        }
      }

      rawProvider = await web3Modal.connect();
      _initListeners(rawProvider);
      connectedProvider = new Web3Provider(rawProvider, "any");
      connectedChainId = await connectedProvider
        .getNetwork()
        .then((network) =>
          typeof network.chainId === "number"
            ? network.chainId
            : parseInt(network.chainId, 16)
        );

      const connectedAddress = await connectedProvider.getSigner().getAddress();

      setChainId(connectedChainId);
      setAddress(connectedAddress);
      setProvider(connectedProvider);
      setConnected(true);
      setLocalItem("connected_chain", connectedChainId);
      setLocalItem("connected_address", connectedAddress);
      setLocalItem("connected_state", true);

      return connectedProvider;
    },
    [_initListeners, switchChain, web3Modal]
  );

  useEffect(() => {
    if (getLocalItem("connected_state")) {
      connect(+getLocalItem("connected_chain", ChainIds.Ethereum));
    }
  }, [connect]);

  const onChainProvider = useMemo(
    () => ({
      connect,
      disconnect,
      provider,
      connected,
      address,
      chainId,
      web3Modal,
      hasCachedProvider,
      switchChain,
    }),
    [
      connect,
      disconnect,
      provider,
      connected,
      address,
      chainId,
      hasCachedProvider,
      switchChain,
      web3Modal,
    ]
  );

  return (
    <Web3Context.Provider value={{ onChainProvider }}>
      {children}
    </Web3Context.Provider>
  );
};

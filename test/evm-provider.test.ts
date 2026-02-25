import { describe, it, expect, beforeEach } from "vitest";
import { InjectedEVMProvider } from "../src/providers/evm-provider";
import { EVMWallet } from "../src/wallet/evm-wallet";

const TEST_KEY = new Uint8Array(32).fill(1);

describe("InjectedEVMProvider", () => {
  let provider: InjectedEVMProvider;
  let wallet: EVMWallet;

  beforeEach(() => {
    wallet = new EVMWallet(TEST_KEY);
    provider = new InjectedEVMProvider({
      wallet,
      chainId: 1,
      rpcUrl: "https://eth.llamarpc.com",
      confirmMode: "auto",
      logLevel: "silent",
    });
  });

  it("has isMetaMask=true", () => {
    expect(provider.isMetaMask).toBe(true);
  });

  it("returns chainId as hex", () => {
    expect(provider.chainId).toBe("0x1");
  });

  it("returns networkVersion as decimal string", () => {
    expect(provider.networkVersion).toBe("1");
  });

  it("returns accounts on eth_requestAccounts", async () => {
    const accounts = await provider.request({ method: "eth_requestAccounts" });
    expect(accounts).toEqual([wallet.address]);
  });

  it("returns accounts on eth_accounts after connecting", async () => {
    await provider.request({ method: "eth_requestAccounts" });
    const accounts = await provider.request({ method: "eth_accounts" });
    expect(accounts).toEqual([wallet.address]);
  });

  it("emits connect and accountsChanged on first eth_requestAccounts", async () => {
    const events: string[] = [];
    provider.on("connect", () => events.push("connect"));
    provider.on("accountsChanged", () => events.push("accountsChanged"));

    await provider.request({ method: "eth_requestAccounts" });
    expect(events).toContain("connect");
    expect(events).toContain("accountsChanged");
  });

  it("does not re-emit connect on subsequent calls", async () => {
    let connectCount = 0;
    provider.on("connect", () => connectCount++);

    await provider.request({ method: "eth_requestAccounts" });
    await provider.request({ method: "eth_requestAccounts" });
    expect(connectCount).toBe(1);
  });

  it("signs a personal_sign message", async () => {
    const hexMsg = "0x" + Buffer.from("hello").toString("hex");
    const sig = await provider.request({
      method: "personal_sign",
      params: [hexMsg, wallet.address],
    });
    expect(sig).toMatch(/^0x/);
  });

  it("switches chain with wallet_switchEthereumChain", async () => {
    // First add chain 137
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: "0x89",
        rpcUrls: ["https://polygon-rpc.com"],
        chainName: "Polygon",
      }],
    });

    let emittedChainId: string | undefined;
    provider.on("chainChanged", (chainId: string) => {
      emittedChainId = chainId;
    });

    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x89" }],
    });

    expect(provider.chainId).toBe("0x89");
    expect(emittedChainId).toBe("0x89");
  });

  it("throws on switching to unknown chain", async () => {
    await expect(
      provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0xdeadbeef" }],
      })
    ).rejects.toThrow();
  });

  it("rejects signing when confirmMode=reject", async () => {
    const rejectProvider = new InjectedEVMProvider({
      wallet,
      chainId: 1,
      rpcUrl: "https://eth.llamarpc.com",
      confirmMode: "reject",
      logLevel: "silent",
    });

    const hexMsg = "0x" + Buffer.from("hello").toString("hex");
    await expect(
      rejectProvider.request({
        method: "personal_sign",
        params: [hexMsg, wallet.address],
      })
    ).rejects.toThrow(/User rejected/);
  });

  it("supports legacy enable()", async () => {
    const accounts = await provider.enable();
    expect(accounts).toEqual([wallet.address]);
  });

  it("supports legacy sendAsync()", async () => {
    const result = await new Promise<any>((resolve, reject) => {
      provider.sendAsync(
        { id: 1, method: "eth_chainId", params: [] },
        (err: any, response: any) => {
          if (err) reject(err);
          else resolve(response);
        }
      );
    });
    expect(result.result).toBe("0x1");
  });

  it("removes event listeners", async () => {
    let count = 0;
    const listener = () => count++;
    provider.on("accountsChanged", listener);
    await provider.request({ method: "eth_requestAccounts" });
    expect(count).toBe(1);

    provider.removeListener("accountsChanged", listener);
    // Reset connection state by creating new provider with same listener check
    const provider2 = new InjectedEVMProvider({
      wallet,
      chainId: 1,
      rpcUrl: "https://eth.llamarpc.com",
      confirmMode: "auto",
      logLevel: "silent",
    });
    provider2.on("accountsChanged", listener);
    provider2.removeListener("accountsChanged", listener);
    await provider2.request({ method: "eth_requestAccounts" });
    expect(count).toBe(1); // should not increment
  });
});

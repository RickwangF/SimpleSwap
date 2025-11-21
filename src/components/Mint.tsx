import { useState } from "react";
import { useAccount } from "wagmi";
import { useWriteContract } from "wagmi";
import TestTokenABI from "../TestTokenABI.json";
import { ethers } from "ethers";

const TOKENS = [
  { name: "TokenA", address: "0x4798388e3adE569570Df626040F07DF71135C48E" },
  { name: "TokenB", address: "0x5A4eA3a013D42Cfd1B1609d19f6eA998EeE06D30" },
  { name: "TokenC", address: "0x86B5df6FF459854ca91318274E47F4eEE245CF28" },
  { name: "TokenD", address: "0x7af86B1034AC4C925Ef5C3F637D1092310d83F03" },
] as const;

export function Mint() {
  const { address, isConnected } = useAccount();
  const [isMinting, setIsMinting] = useState(false);
  const [txHashes, setTxHashes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { writeContractAsync } = useWriteContract();

  const handleMint = async () => {
    if (!isConnected || !address) {
      setError("请先连接钱包");
      return;
    }

    setIsMinting(true);
    setError(null);
    setTxHashes([]);

    try {
      const results = await Promise.allSettled(
        TOKENS.map(async (token) => {
          // wagmi writeContract 自动使用连接的钱包签名交易
          const tx = await writeContractAsync({
            address: token.address,
            abi: TestTokenABI,
            functionName: "mint",
            args: [address, ethers.parseUnits("10000", 18)],
          });
          return { name: token.name, hash: tx };
        })
      );

      const successfulTxs: string[] = [];
      const errors: string[] = [];

      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          successfulTxs.push(`${result.value.name}: ${result.value.hash}`);
        } else {
          const tokenName = TOKENS[index].name;
          const errMsg = result.reason?.message || "未知错误";
          errors.push(`${tokenName} mint 失败: ${errMsg}`);
          console.error(`${tokenName} mint error:`, result.reason);
        }
      });

      setTxHashes(successfulTxs);
      if (errors.length > 0) setError(`部分交易失败: ${errors.join("; ")}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Mint 过程出错");
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Mint 测试代币</h2>
      <button
        onClick={handleMint}
        disabled={isMinting || !isConnected}
        style={{
          padding: "8px 16px",
          opacity: isMinting || !isConnected ? 0.6 : 1,
        }}
      >
        {isMinting ? "Minting..." : "Mint 4 Tokens"}
      </button>

      {txHashes.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h4>交易 Hash:</h4>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {txHashes.map((hash, idx) => (
              <li
                key={idx}
                style={{
                  marginBottom: 8,
                  padding: 8,
                  backgroundColor: "#f5f5f5",
                  borderRadius: 4,
                }}
              >
                {hash}
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <p style={{ color: "red", marginTop: 16 }}>错误: {error}</p>}
      {!isConnected && (
        <p style={{ color: "orange", marginTop: 16 }}>请先连接钱包</p>
      )}
    </div>
  );
}

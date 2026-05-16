
const ETHERSCAN_API_KEY = import.meta.env.VITE_ETHERSCAN_KEY;
// Updated Target Address from user's latest change
const TARGET_ADDRESS = '0x388C818CA8B9251b393131C08a736A67ccB19297'.toLowerCase();

export interface VerificationResult {
  isValid: boolean;
  message: string;
}

const getEthPrice = async (): Promise<number> => {
  try {
    const response = await fetch(`https://api.etherscan.io/v2/api?chainid=1&module=stats&action=ethprice&apikey=${ETHERSCAN_API_KEY}`);
    const data = await response.json();
    if (data.status === "1" && data.result?.ethusd) {
      return parseFloat(data.result.ethusd);
    }
    return 2500; // Fallback price if API fails
  } catch (error) {
    console.error("Failed to fetch ETH price:", error);
    return 2500;
  }
};

export const verifyTransaction = async (txHash: string, expectedAmountUsd: number): Promise<VerificationResult> => {
  try {
    if (!txHash || !txHash.startsWith('0x') || txHash.length !== 66) {
      return { isValid: false, message: "Invalid transaction hash format." };
    }

    // 1. Get Transaction Details
    console.log(`[Etherscan] Verifying hash: ${txHash}`);
    const apiUrl = `https://api.etherscan.io/v2/api?chainid=1&module=proxy&action=eth_getTransactionByHash&txhash=${txHash}&apikey=${ETHERSCAN_API_KEY}`;

    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();
    if (!data || data.error || !data.result) {
      return { isValid: false, message: data?.error?.message || "Transaction not found on Etherscan." };
    }

    const tx = data.result;
    const input = tx.input || '0x';
    const txTo = tx.to?.toLowerCase();
    const isTransfer = input.startsWith('0xa9059cbb');
    const isTransferFrom = input.startsWith('0x23b872dd');

    let recipient = '';
    let amountUsd = 0;
    let tokenAmount = 0;
    let isEth = false;

    // Case 1: Direct interaction with TARGET_ADDRESS (Direct ETH Payment)
    if (txTo === TARGET_ADDRESS) {
      console.log("[Etherscan] Case: Direct ETH transfer");
      recipient = txTo;
      tokenAmount = parseInt(tx.value, 16) / 1e18;
      isEth = true;

      const ethPrice = await getEthPrice();
      amountUsd = tokenAmount * ethPrice;
      console.log(`[Etherscan] ETH Amount: ${tokenAmount}, Current Price: $${ethPrice}, USD Value: $${amountUsd}`);
    }
    // Case 2: Standard ERC-20 Transfer (USDT/WBTC/BOMB)
    else if (isTransfer || isTransferFrom) {
      console.log("[Etherscan] Case: ERC-20 Transfer");
      let amountHex = '0x0';
      if (isTransfer) {
        recipient = '0x' + input.substring(34, 74).toLowerCase();
        amountHex = '0x' + input.substring(74);
      } else {
        recipient = '0x' + input.substring(98, 138).toLowerCase();
        amountHex = '0x' + input.substring(138);
      }

      let decimals = 18;
      if (txTo === '0xdac17f958d2ee523a2206206994597c13d831ec7') decimals = 6; // USDT
      else if (txTo === '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599') decimals = 8; // WBTC

      tokenAmount = parseInt(amountHex, 16) / Math.pow(10, decimals);

      // For stablecoins (USDT), 1 Token = 1 USD roughly. 
      // For others like BOMB or WBTC, we'd need another price API, but for now we assume tokens are USD-pegged or USDT.
      // If it's USDT, amountUsd = tokenAmount.
      amountUsd = tokenAmount;
    } else {
      return { isValid: false, message: "Neither a direct transfer nor a standard ERC-20 transfer." };
    }

    if (recipient !== TARGET_ADDRESS) {
      console.warn(`[Etherscan] Recipient mismatch. Expected: ${TARGET_ADDRESS}, Found: ${recipient}`);
      return { isValid: false, message: `Recipient mismatch. Sent to ${recipient.substring(0, 10)}...` };
    }

    // 2. Check Receipt for confirmation status
    const receiptUrl = `https://api.etherscan.io/v2/api?chainid=1&module=proxy&action=eth_getTransactionReceipt&txhash=${txHash}&apikey=${ETHERSCAN_API_KEY}`;
    const receiptResponse = await fetch(receiptUrl);
    const receiptData = await receiptResponse.json();

    if (!receiptData.result || receiptData.result.status !== '0x1') {
      return { isValid: false, message: "Transaction failed or is still pending on the blockchain." };
    }

    // 3. Final USD check
    console.log(`[Etherscan] Final USD detected: $${amountUsd}, Required: $${expectedAmountUsd}`);
    if (amountUsd < expectedAmountUsd * 0.95) { // 5% tolerance for crypto volatility
      return { isValid: false, message: `Amount sent ($${amountUsd.toFixed(2)}) is less than required ($${expectedAmountUsd}).` };
    }

    return { isValid: true, message: "Transaction verified successfully!" };

  } catch (error) {
    console.error("Verification error:", error);
    return { isValid: false, message: "Neural link to Etherscan failed. Please try again." };
  }
};

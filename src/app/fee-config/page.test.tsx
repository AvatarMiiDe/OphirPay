// SPDX-License-Identifier: MIT

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import FeeConfigPage from "./page";
import { useWallet } from "@/hooks/useMultiWallet";
import { useApiQuery } from "@/hooks/useApiQuery";
import { setFeeConfig, setFeeCollector } from "@/lib/contract-advanced";
import { useToast } from "@/components/ui/Toast";

// Mock the hooks and contract functions
vi.mock("@/hooks/useMultiWallet", () => ({
  useWallet: vi.fn(),
}));

vi.mock("@/hooks/useApiQuery", () => ({
  useApiQuery: vi.fn(),
}));

vi.mock("@/lib/contract-advanced", () => ({
  setFeeConfig: vi.fn(),
  setFeeCollector: vi.fn(),
}));

vi.mock("@/components/ui/Toast", () => ({
  useToast: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
}));

describe("FeeConfigPage", () => {
  const mockWallet = {
    publicKey: "GABC1234567890",
    connected: true,
    network: "TESTNET",
    balance: "100.00",
    balanceLoading: false,
    activeWalletId: "freighter",
  };

  const mockConfig = {
    payment_fee_bps: 100,
    escrow_fee_bps: 200,
    stream_fee_bps: 300,
    batch_base_fee: 1000000,
    batch_per_item_fee: 100000,
    enabled: true,
  };

  const mockToast = {
    toast: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    dismiss: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset all mocks
    (useWallet as any).mockReturnValue({ wallet: mockWallet });
    (useApiQuery as any).mockReturnValue({
      data: mockConfig,
      isLoading: false,
      error: null,
    });
    (useToast as any).mockReturnValue(mockToast);
    (setFeeConfig as any).mockResolvedValue({
      success: true,
      txHash: "0xabc123",
    });
    (setFeeCollector as any).mockResolvedValue({
      success: true,
      txHash: "0xdef456",
    });
  });

  it("renders fee configuration with on-chain values", () => {
    render(<FeeConfigPage />);
    
    // Check for the main heading
    expect(screen.getByText("Fee Configuration")).toBeInTheDocument();
    
    // Check for fee values
    expect(screen.getByText("1.00%")).toBeInTheDocument(); // 100 bps
    expect(screen.getByText("2.00%")).toBeInTheDocument(); // 200 bps
    expect(screen.getByText("3.00%")).toBeInTheDocument(); // 300 bps
    
    // Check for bps values
    expect(screen.getByText("100 bps")).toBeInTheDocument();
    expect(screen.getByText("200 bps")).toBeInTheDocument();
    expect(screen.getByText("300 bps")).toBeInTheDocument();
    
    // Check for action buttons
    expect(screen.getByRole('button', { name: /edit fees/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /set collector/i })).toBeInTheDocument();
  });

  it("successfully updates fee config with transaction hash", async () => {
    const mockTxHash = "0xabc123def456789";
    (setFeeConfig as any).mockResolvedValue({
      success: true,
      txHash: mockTxHash,
    });

    render(<FeeConfigPage />);
    
    // Open fee modal using role
    const editButton = screen.getByRole('button', { name: /edit fees/i });
    fireEvent.click(editButton);
    
    // Wait for modal to appear
    await waitFor(() => {
      expect(screen.getByText("Configure Protocol Fees")).toBeInTheDocument();
    });
    
    // Update only payment fee, keep other values from config
    const paymentInput = screen.getByLabelText(/payment fee/i);
    fireEvent.change(paymentInput, { target: { value: "150" } });
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: /save fee configuration/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(setFeeConfig).toHaveBeenCalledWith(
        "GABC1234567890",
        150,
        200, // escrowFee from config
        300, // streamFee from config
        1000000, // batchBase from config
        100000, // batchPerItem from config
        true, // enabled from config
      );
    });
    
    // Check for transaction status
    await waitFor(() => {
      expect(screen.getByText(/Tx: 0xabc123def456789/)).toBeInTheDocument();
    });
  });

  it("validates fee bps limits and disables submit", async () => {
    render(<FeeConfigPage />);
    
    // Open fee modal
    const editButton = screen.getByRole('button', { name: /edit fees/i });
    fireEvent.click(editButton);
    
    // Wait for modal
    await waitFor(() => {
      expect(screen.getByText("Configure Protocol Fees")).toBeInTheDocument();
    });
    
    // Try to set fee above max
    const paymentInput = screen.getByLabelText(/payment fee/i);
    fireEvent.change(paymentInput, { target: { value: "1500" } });
    
    // Submit button should be disabled
    const submitButton = screen.getByRole('button', { name: /save fee configuration/i });
    expect(submitButton).toBeDisabled();
    
    // Input should show error styling
    expect(paymentInput).toHaveClass("border-red-500");
  });

  it("shows validation errors when submitting invalid fees", async () => {
    render(<FeeConfigPage />);
    
    // Open fee modal
    const editButton = screen.getByRole('button', { name: /edit fees/i });
    fireEvent.click(editButton);
    
    // Wait for modal
    await waitFor(() => {
      expect(screen.getByText("Configure Protocol Fees")).toBeInTheDocument();
    });
    
    // Set invalid fees
    const paymentInput = screen.getByLabelText(/payment fee/i);
    fireEvent.change(paymentInput, { target: { value: "1500" } });
    
    const escrowInput = screen.getByLabelText(/escrow fee/i);
    fireEvent.change(escrowInput, { target: { value: "-10" } });
    
    // Contract should not be called
    expect(setFeeConfig).not.toHaveBeenCalled();
    
    // Submit button should be disabled due to invalid fees
    const submitButton = screen.getByRole('button', { name: /save fee configuration/i });
    expect(submitButton).toBeDisabled();
  });

  it("shows error on failed contract call", async () => {
    (setFeeConfig as any).mockResolvedValue({
      success: false,
      error: "Contract rejected transaction: fee too high",
    });

    render(<FeeConfigPage />);
    
    // Open fee modal
    const editButton = screen.getByRole('button', { name: /edit fees/i });
    fireEvent.click(editButton);
    
    // Wait for modal
    await waitFor(() => {
      expect(screen.getByText("Configure Protocol Fees")).toBeInTheDocument();
    });
    
    // Submit form with valid values from config
    const submitButton = screen.getByRole('button', { name: /save fee configuration/i });
    fireEvent.click(submitButton);

    // Check for error message
    await waitFor(() => {
      expect(screen.getByText("Contract rejected transaction: fee too high")).toBeInTheDocument();
    });
  });

  it("updates fee collector successfully", async () => {
    const mockTxHash = "0xcollector123";
    (setFeeCollector as any).mockResolvedValue({
      success: true,
      txHash: mockTxHash,
    });

    render(<FeeConfigPage />);
    
    // Open collector modal using role
    const collectorButton = screen.getByRole('button', { name: /set collector/i });
    fireEvent.click(collectorButton);
    
    // Wait for modal - use heading role to avoid multiple matches
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: "Set Fee Collector" })).toBeInTheDocument();
    });
    
    // Enter collector address
    const collectorInput = screen.getByLabelText(/collector address/i);
    fireEvent.change(collectorInput, { target: { value: "GCOLLECTOR123456789" } });
    
    // Submit using the button in the modal (not the main button)
    const submitButton = screen.getByRole('button', { name: /^set fee collector$/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(setFeeCollector).toHaveBeenCalledWith(
        "GABC1234567890",
        "GCOLLECTOR123456789",
      );
    });
    
    // Check for transaction status
    await waitFor(() => {
      expect(screen.getByText(/Tx: 0xcollector123/)).toBeInTheDocument();
    });
  });

  it("shows wallet connection warning when disconnected", () => {
    (useWallet as any).mockReturnValue({ 
      wallet: { 
        ...mockWallet,
        connected: false, 
        publicKey: null 
      } 
    });

    render(<FeeConfigPage />);
    
    // Check for wallet warning
    expect(screen.getByText(/Wallet not connected/i)).toBeInTheDocument();
    expect(screen.getByText(/Connect your wallet to update fee configuration on-chain/i)).toBeInTheDocument();
  });

  it("shows loading state", () => {
    (useApiQuery as any).mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });

    const { container } = render(<FeeConfigPage />);
    
    // Should show skeleton loading
    const skeletonElements = container.querySelectorAll(".animate-pulse");
    expect(skeletonElements.length).toBeGreaterThan(0);
  });

  it("shows empty state when no config exists", () => {
    (useApiQuery as any).mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });

    render(<FeeConfigPage />);
    
    expect(screen.getByText("No Fee Config Set")).toBeInTheDocument();
    expect(screen.getByText("Configure your protocol fee structure on-chain.")).toBeInTheDocument();
  });
});
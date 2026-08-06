"use client";

import { useState, useEffect, useCallback } from "react";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";

interface Proposal {
  id: number;
  title: string;
  description: string;
  action_type: string;
  yes_votes: number;
  no_votes: number;
  voting_ends_at: number | null;
  executed: boolean;
  proposer: string;
}

export default function GovernancePage() {
  const toast = useToast();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formAction, setFormAction] = useState("upgrade");
  const [formTarget, setFormTarget] = useState("");
  const [formData, setFormData] = useState("");

  const fetchProposals = useCallback(async () => {
    try {
      const res = await fetch("/api/governance/proposals");
      if (res.ok) setProposals((await res.json()).data ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProposals(); }, [fetchProposals]);

  const handleCreate = async () => {
    if (!formTitle || !formDesc) { toast.error("Title and description are required"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/governance/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formTitle,
          description: formDesc,
          actionType: formAction,
          target: formTarget,
          data: formData,
        }),
      });
      if (res.ok) {
        toast.success("Proposal created");
        setShowCreate(false);
        setFormTitle("");
        setFormDesc("");
        setFormTarget("");
        setFormData("");
        fetchProposals();
      } else {
        toast.error("Failed to create proposal");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (proposalId: number, support: boolean) => {
    try {
      const res = await fetch("/api/governance/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId, support, weight: 1 }),
      });
      if (res.ok) {
        toast.success(support ? "Voted YES" : "Voted NO");
        fetchProposals();
      } else {
        toast.error("Vote failed");
      }
    } catch {
      toast.error("Network error");
    }
  };

  const handleExecute = async (proposalId: number) => {
    try {
      const res = await fetch(`/api/governance/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(data.passed ? "Proposal PASSED" : "Proposal DEFEATED");
        fetchProposals();
      } else {
        toast.error("Execution failed");
      }
    } catch {
      toast.error("Network error");
    }
  };

  const isVotingOpen = (p: Proposal) => {
    if (!p.voting_ends_at || p.executed) return false;
    return Date.now() / 1000 < (p.voting_ends_at as number);
  };

  const voteProgress = (p: Proposal) => {
    const total = p.yes_votes + p.no_votes;
    if (total === 0) return { yes: 0, no: 0 };
    return {
      yes: Math.round((p.yes_votes / total) * 100),
      no: Math.round((p.no_votes / total) * 100),
    };
  };

  if (loading) {
    return (
      <div className="animate-fade-in space-y-6">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="grid gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            🏛 Governance
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            DAO-ready proposal → vote → execute workflow
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>+ New Proposal</Button>
      </div>

      {proposals.length === 0 ? (
        <EmptyState
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-gray-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
            </svg>
          }
          title="No Governance Proposals"
          description="Create a proposal to upgrade the contract, change fees, or modify multisig configuration."
          actionLabel="Create Proposal"
          onAction={() => setShowCreate(true)}
        />
      ) : (
        <div className="space-y-3">
          {proposals.map((p) => {
            const progress = voteProgress(p);
            return (
              <Card key={p.id} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{p.title}</h3>
                        <Badge variant={p.executed ? (p.yes_votes > p.no_votes ? "success" : "danger") : isVotingOpen(p) ? "info" : "warning"}>
                          {p.executed ? (p.yes_votes > p.no_votes ? "Passed" : "Defeated") : isVotingOpen(p) ? "Voting" : "Closed"}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{p.description}</p>
                      <span className="text-xs text-gray-400 mt-1 block">
                        Action: {p.action_type} · By: {p.proposer?.slice?.(0, 8)}...
                      </span>
                    </div>
                  </div>

                  {/* Vote bar */}
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Yes: {p.yes_votes}</span>
                      <span>No: {p.no_votes}</span>
                    </div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
                      <div
                        className="h-full bg-green-500 transition-all"
                        style={{ width: `${progress.yes}%` }}
                      />
                      <div
                        className="h-full bg-red-500 transition-all"
                        style={{ width: `${progress.no}%` }}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {isVotingOpen(p) && !p.executed && (
                      <>
                        <Button size="sm" variant="primary" onClick={() => handleVote(p.id, true)}>👍 Yes</Button>
                        <Button size="sm" variant="secondary" onClick={() => handleVote(p.id, false)}>👎 No</Button>
                      </>
                    )}
                    {!isVotingOpen(p) && !p.executed && (
                      <Button size="sm" onClick={() => handleExecute(p.id)}>Execute</Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Governance Proposal"
        description="Propose a contract upgrade, fee change, or multisig reconfiguration."
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
            <input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700" placeholder="Upgrade contract to v3" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} rows={3} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700" placeholder="This proposal upgrades the OphirPay contract..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Action Type</label>
            <select value={formAction} onChange={(e) => setFormAction(e.target.value)} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700">
              <option value="upgrade">Contract Upgrade</option>
              <option value="set_fee_config">Fee Configuration</option>
              <option value="set_multisig_config">Multisig Configuration</option>
              <option value="transfer_ownership">Transfer Ownership</option>
            </select>
          </div>
          <Button onClick={handleCreate} loading={submitting} className="w-full">Create Proposal</Button>
        </div>
      </Modal>
    </div>
  );
}

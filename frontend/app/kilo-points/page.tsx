"use client";

import { useAccount } from "wagmi";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, TrendingUp, Users, Zap, Award, ExternalLink } from "lucide-react";
import { KUB_TESTNET_MARKETS } from "@/config/markets";

// Placeholder data structure - will be replaced with API data when ready
interface UserPoints {
  totalPoints: number;
  rank: number;
  tier: "Bronze" | "Silver" | "Gold" | "Platinum";
  activities: {
    type: "supply" | "borrow" | "referral" | "first_deposit";
    description: string;
    points: number;
    date: string;
  }[];
}

const POINTS_API_URL = "https://api.kilolend.xyz/points"; // Placeholder - will be ready later

// Mock data for UI development (will be replaced by API)
const mockUserPoints: UserPoints = {
  totalPoints: 0,
  rank: 0,
  tier: "Bronze",
  activities: [],
};

// Tier benefits
const tierBenefits = {
  Bronze: { color: "text-[#cd7f32]", bg: "bg-[#cd7f32]/10", nextTier: "Silver", pointsNeeded: 1000 },
  Silver: { color: "text-[#c0c0c0]", bg: "bg-[#c0c0c0]/10", nextTier: "Gold", pointsNeeded: 5000 },
  Gold: { color: "text-[#ffd700]", bg: "bg-[#ffd700]/10", nextTier: "Platinum", pointsNeeded: 25000 },
  Platinum: { color: "text-[#e5e4e2]", bg: "bg-[#e5e4e2]/10", nextTier: null, pointsNeeded: 0 },
};

function TierBadge({ tier }: { tier: UserPoints["tier"] }) {
  const benefits = tierBenefits[tier];
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${benefits.bg} ${benefits.color}`}>
      <Award size={14} />
      {tier}
    </span>
  );
}

function PointsCard({ icon: Icon, label, value, subLabel }: { icon: any; label: string; value: React.ReactNode; subLabel?: string }) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-[#e2e8f0]">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-[#06C755]/10 flex items-center justify-center">
          <Icon size={20} className="text-[#06C755]" />
        </div>
        <p className="text-sm text-[#64748b]">{label}</p>
      </div>
      <p className="text-2xl font-bold text-[#1e293b]">{value}</p>
      {subLabel && <p className="text-xs text-[#94a3b8] mt-1">{subLabel}</p>}
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div className="flex items-center justify-between py-4 border-b border-[#e2e8f0] animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#e2e8f0]" />
        <div>
          <div className="h-4 w-32 bg-[#e2e8f0] rounded mb-1" />
          <div className="h-3 w-20 bg-[#e2e8f0] rounded" />
        </div>
      </div>
      <div className="h-4 w-16 bg-[#e2e8f0] rounded" />
    </div>
  );
}

export default function KiloPointsPage() {
  const { address, isConnected } = useAccount();

  // TODO: Replace with actual API call when backend is ready
  // const { data: pointsData, isLoading } = useSWR<UserPoints>(
  //   isConnected ? `${POINTS_API_URL}/${address}` : null,
  //   fetcher
  // );

  // Using mock data for UI development
  const pointsData: UserPoints | null = isConnected ? mockUserPoints : null;
  const isLoading = false;

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-[#f8fafc]">
        <div className="max-w-[800px] mx-auto px-4 py-8">
          {/* Header */}
          <Link href="/" className="inline-flex items-center gap-2 text-[#64748b] hover:text-[#1e293b] mb-6">
            <ArrowLeft size={20} />
            Back to Home
          </Link>

          {/* Connect Wallet Prompt */}
          <div className="bg-white rounded-2xl p-12 border border-[#e2e8f0] text-center">
            <div className="w-20 h-20 rounded-full bg-[#06C755]/10 flex items-center justify-center mx-auto mb-6">
              <Award size={40} className="text-[#06C755]" />
            </div>
            <h1 className="text-2xl font-bold text-[#1e293b] mb-3">Connect Your Wallet</h1>
            <p className="text-[#64748b] mb-8 max-w-[400px] mx-auto">
              Connect your wallet to view your KILO Points, track your activity, and unlock exclusive rewards.
            </p>
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-[#f1f5f9] rounded-xl text-sm text-[#64748b]">
              <span className="w-2 h-2 rounded-full bg-[#06C755] animate-pulse" />
              Points are earned through lending, borrowing, and referrals
            </div>
          </div>
        </div>
      </div>
    );
  }

  const userTier = pointsData?.tier || "Bronze";
  const tierInfo = tierBenefits[userTier];

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="max-w-[1000px] mx-auto px-4 py-8">
        {/* Header */}
        <Link href="/" className="inline-flex items-center gap-2 text-[#64748b] hover:text-[#1e293b] mb-6">
          <ArrowLeft size={20} />
          Back to Home
        </Link>

        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1e293b] mb-2">KILO Points</h1>
          <p className="text-[#64748b]">Earn rewards by using KiloLend. More activity = more points.</p>
        </div>

        {/* Main Content */}
        {isLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl p-6 border border-[#e2e8f0] animate-pulse">
                  <div className="h-10 w-10 rounded-xl bg-[#e2e8f0] mb-3" />
                  <div className="h-4 w-20 bg-[#e2e8f0] rounded mb-2" />
                  <div className="h-8 w-16 bg-[#e2e8f0] rounded" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Points Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <PointsCard
                icon={Award}
                label="Total Points"
                value={pointsData?.totalPoints.toLocaleString() || "0"}
                subLabel="All time earned"
              />
              <PointsCard
                icon={TrendingUp}
                label="Global Rank"
                value={`#${pointsData?.rank || "—"}`}
                subLabel="Out of all users"
              />
              <PointsCard
                icon={Zap}
                label="Your Tier"
                value={<TierBadge tier={userTier} />}
                subLabel={tierInfo.nextTier ? `${tierInfo.pointsNeeded.toLocaleString()} points to ${tierInfo.nextTier}` : "Maximum tier reached!"}
              />
            </div>

            {/* How to Earn Section */}
            <div className="bg-white rounded-2xl p-6 border border-[#e2e8f0] mb-8">
              <h2 className="text-xl font-bold text-[#1e293b] mb-4">How to Earn Points</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex items-start gap-3 p-4 bg-[#f8fafc] rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-[#06C755]/10 flex items-center justify-center shrink-0">
                    <TrendingUp size={18} className="text-[#06C755]" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#1e293b]">Supply Assets</p>
                    <p className="text-sm text-[#64748b]">Earn 1 point per $100 supplied</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-[#f8fafc] rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-[#06C755]/10 flex items-center justify-center shrink-0">
                    <Users size={18} className="text-[#06C755]" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#1e293b]">Borrow Assets</p>
                    <p className="text-sm text-[#64748b]">Earn 1 point per $100 borrowed</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-[#f8fafc] rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-[#06C755]/10 flex items-center justify-center shrink-0">
                    <Zap size={18} className="text-[#06C755]" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#1e293b]">First Deposit</p>
                    <p className="text-sm text-[#64748b]">+500 points bonus</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-[#f8fafc] rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-[#06C755]/10 flex items-center justify-center shrink-0">
                    <Award size={18} className="text-[#06C755]" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#1e293b]">Referrals</p>
                    <p className="text-sm text-[#64748b]">+100 points per referral</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Activity History */}
            <div className="bg-white rounded-2xl p-6 border border-[#e2e8f0]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-[#1e293b]">Activity History</h2>
                {pointsData?.activities && pointsData.activities.length > 0 && (
                  <span className="text-sm text-[#64748b]">
                    {pointsData.activities.length} activities
                  </span>
                )}
              </div>

              {pointsData?.activities && pointsData.activities.length > 0 ? (
                <div className="divide-y divide-[#e2e8f0]">
                  {pointsData.activities.map((activity, index) => (
                    <div key={index} className="flex items-center justify-between py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          activity.type === "supply" ? "bg-[#06C755]/10" :
                          activity.type === "borrow" ? "bg-[#f59e0b]/10" :
                          "bg-[#8b5cf6]/10"
                        }`}>
                          {activity.type === "supply" ? (
                            <TrendingUp size={18} className="text-[#06C755]" />
                          ) : activity.type === "borrow" ? (
                            <Users size={18} className="text-[#f59e0b]" />
                          ) : (
                            <Award size={18} className="text-[#8b5cf6]" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-[#1e293b]">{activity.description}</p>
                          <p className="text-sm text-[#64748b]">{activity.date}</p>
                        </div>
                      </div>
                      <span className="text-[#06C755] font-semibold">+{activity.points}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-[#f1f5f9] flex items-center justify-center mx-auto mb-4">
                    <Zap size={24} className="text-[#64748b]" />
                  </div>
                  <p className="text-[#64748b] mb-2">No activity yet</p>
                  <p className="text-sm text-[#94a3b8]">
                    Start lending or borrowing to earn points!
                  </p>
                  <Link
                    href="/markets"
                    className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-[#06C755] text-white rounded-lg text-sm font-semibold hover:bg-[#05b54e] transition-colors"
                  >
                    Go to Markets
                  </Link>
                </div>
              )}
            </div>

            {/* Footer Note */}
            <div className="mt-6 text-center">
              <p className="text-sm text-[#94a3b8]">
                Points are calculated daily. Need help?{" "}
                <a href="https://docs.kilolend.xyz" target="_blank" rel="noopener noreferrer" className="text-[#06C755] hover:underline inline-flex items-center gap-1">
                  View Documentation
                  <ExternalLink size={12} />
                </a>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

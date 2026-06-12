"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Improvement = { name: string; from: number; to: number; delta: number };
type Report = {
  name: string;
  monthName: string;
  attendance: { days: number; possible: number };
  improvements: Improvement[];
  totalVolume: number;
  streak: number;
};

function attendanceMessage(days: number, possible: number) {
  const pct = days / possible;
  if (pct >= 0.9) return "Incredible consistency. You showed up.";
  if (pct >= 0.7) return "Solid month. Keep pushing.";
  if (pct >= 0.5) return "Good start. More days = more gains.";
  return "Every session counts. Let's pick it up.";
}

function streakMessage(streak: number) {
  if (streak >= 10) return `${streak} days straight. Unstoppable.`;
  if (streak >= 5) return `${streak} days in a row. Don't break the chain.`;
  if (streak >= 2) return `${streak} days in a row. Keep it going.`;
  if (streak === 1) return "1 day streak. Show up again tomorrow.";
  return "Start your streak today.";
}

export default function EmailPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("it_phone");
    if (!saved) { setLoading(false); return; }
    setPhone(saved);
    fetch(`/api/report?phone=${encodeURIComponent(saved)}`)
      .then((r) => r.json())
      .then((data) => setReport(data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-screen text-sm text-muted-foreground">Loading...</div>;

  if (!phone || !report) {
    return (
      <div className="flex items-center justify-center h-screen text-sm text-center px-4">
        <div>
          <p className="mb-2">No data found.</p>
          <Link href="/" className="underline">Go back and sign in first.</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 py-10 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg overflow-hidden">

        {/* Email header */}
        <div className="bg-gray-900 px-8 py-6 text-white">
          <p className="text-xs uppercase tracking-widest text-gray-400 mb-1">Iron Temple</p>
          <h1 className="text-xl font-bold">Monthly Progress Report</h1>
          <p className="text-sm text-gray-400 mt-1">{report.monthName}</p>
        </div>

        <div className="px-8 py-6 flex flex-col gap-6">

          {/* Greeting */}
          <p className="text-sm text-gray-600">Hey {report.name}, here's how your month looked.</p>

          {/* Attendance */}
          <div>
            <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">Attendance</p>
            <p className="text-3xl font-bold">
              {report.attendance.days}
              <span className="text-lg font-normal text-gray-400"> / {report.attendance.possible} days</span>
            </p>
            <p className="text-sm text-gray-500 mt-1">{attendanceMessage(report.attendance.days, report.attendance.possible)}</p>
          </div>

          {/* Top improvements */}
          {report.improvements.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">Top Improvements</p>
              <div className="flex flex-col gap-2">
                {report.improvements.map((imp, i) => (
                  <div key={imp.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-4">{i + 1}.</span>
                      <span className="text-sm font-medium">{imp.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-gray-400">{imp.from}lbs</span>
                      <span className="text-sm text-gray-400 mx-1">→</span>
                      <span className="text-sm font-semibold">{imp.to}lbs</span>
                      <span className="text-xs text-green-600 ml-2">+{imp.delta}lbs</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.improvements.length === 0 && (
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">Top Improvements</p>
              <p className="text-sm text-gray-500">Log more sessions to see your strength progress.</p>
            </div>
          )}

          {/* Total Volume */}
          <div>
            <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">Total Volume</p>
            <p className="text-3xl font-bold">
              {report.totalVolume.toLocaleString()}
              <span className="text-lg font-normal text-gray-400"> lbs lifted</span>
            </p>
          </div>

          {/* Streak */}
          <div>
            <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">Current Streak</p>
            <p className="text-3xl font-bold">
              {report.streak}
              <span className="text-lg font-normal text-gray-400"> {report.streak === 1 ? "day" : "days"}</span>
            </p>
            <p className="text-sm text-gray-500 mt-1">{streakMessage(report.streak)}</p>
          </div>

          {/* Footer */}
          <div className="border-t pt-4">
            <p className="text-xs text-gray-400 text-center">
              Iron Temple · Keep showing up · <Link href="/" className="underline">Back to chat</Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}

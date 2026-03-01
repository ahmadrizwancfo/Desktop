'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Users, DollarSign, Calendar, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

// Mock payroll data
const employees = [
    { id: 1, name: 'Priya Sharma', role: 'Senior Developer', salary: 150000, status: 'Approved', tds: 15000 },
    { id: 2, name: 'Rahul Gupta', role: 'Product Manager', salary: 130000, status: 'Pending', tds: 13000 },
    { id: 3, name: 'Anita Patel', role: 'UI/UX Designer', salary: 95000, status: 'Approved', tds: 9500 },
    { id: 4, name: 'Vikram Singh', role: 'Backend Developer', salary: 120000, status: 'Approved', tds: 12000 },
    { id: 5, name: 'Meera Joshi', role: 'Marketing Lead', salary: 110000, status: 'Pending', tds: 11000 },
];

export default function PayrollPage() {
    const totalSalary = employees.reduce((sum, e) => sum + e.salary, 0);
    const totalTds = employees.reduce((sum, e) => sum + e.tds, 0);
    const pendingCount = employees.filter(e => e.status === 'Pending').length;

    return (
        <DashboardLayout>
            <div className="flex flex-col gap-8 max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-white">Payroll</h1>
                        <p className="text-slate-400 mt-1">Manage salaries, TDS deductions, and payroll approvals</p>
                    </div>
                    <div className="flex gap-3">
                        <button className="px-5 py-3 bg-white/5 border border-white/10 text-white font-bold rounded-2xl flex items-center gap-2 hover:bg-white/10 transition-all">
                            <Calendar className="w-4 h-4" />
                            January 2026
                        </button>
                        <button className="px-5 py-3 bg-primary hover:bg-indigo-600 text-white font-bold rounded-2xl flex items-center gap-2 transition-all">
                            <CheckCircle className="w-4 h-4" />
                            Process Payroll
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Total Payroll', value: `₹${(totalSalary / 100000).toFixed(2)}L`, icon: DollarSign, color: 'text-primary' },
                        { label: 'Employees', value: employees.length, icon: Users, color: 'text-emerald-400' },
                        { label: 'TDS Liability', value: `₹${(totalTds / 1000).toFixed(1)}K`, icon: AlertTriangle, color: 'text-amber-400' },
                        { label: 'Pending Approval', value: pendingCount, icon: Clock, color: 'text-rose-400' },
                    ].map((stat, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="glass-card rounded-2xl p-5 flex items-center gap-4"
                        >
                            <div className={`w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center ${stat.color}`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">{stat.label}</p>
                                <p className="text-2xl font-bold text-white">{stat.value}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Payroll Table */}
                <div className="glass-card rounded-3xl overflow-hidden">
                    <div className="p-6 border-b border-white/10">
                        <h3 className="font-bold text-white">Employee Salaries - January 2026</h3>
                    </div>
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="text-left p-4 text-xs text-slate-500 uppercase tracking-widest font-bold">Employee</th>
                                <th className="text-left p-4 text-xs text-slate-500 uppercase tracking-widest font-bold">Role</th>
                                <th className="text-left p-4 text-xs text-slate-500 uppercase tracking-widest font-bold">Gross Salary</th>
                                <th className="text-left p-4 text-xs text-slate-500 uppercase tracking-widest font-bold">TDS</th>
                                <th className="text-left p-4 text-xs text-slate-500 uppercase tracking-widest font-bold">Net Payable</th>
                                <th className="text-left p-4 text-xs text-slate-500 uppercase tracking-widest font-bold">Status</th>
                                <th className="text-right p-4 text-xs text-slate-500 uppercase tracking-widest font-bold">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {employees.map((emp, i) => (
                                <motion.tr
                                    key={emp.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                                >
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center text-white font-bold">
                                                {emp.name.charAt(0)}
                                            </div>
                                            <span className="font-bold text-white">{emp.name}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-slate-400">{emp.role}</td>
                                    <td className="p-4 font-bold text-white">₹{(emp.salary / 1000).toFixed(0)}K</td>
                                    <td className="p-4 text-rose-400">-₹{(emp.tds / 1000).toFixed(1)}K</td>
                                    <td className="p-4 font-bold text-emerald-400">₹{((emp.salary - emp.tds) / 1000).toFixed(1)}K</td>
                                    <td className="p-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${emp.status === 'Approved'
                                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                            }`}>
                                            {emp.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <button className="text-xs text-primary font-bold hover:underline">
                                            {emp.status === 'Pending' ? 'Approve' : 'View'}
                                        </button>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="p-4 border-t border-white/10 flex justify-between items-center bg-white/5">
                        <span className="text-slate-400 font-bold">Total</span>
                        <div className="flex gap-8">
                            <span className="text-white font-bold">₹{(totalSalary / 100000).toFixed(2)}L</span>
                            <span className="text-rose-400 font-bold">-₹{(totalTds / 1000).toFixed(1)}K</span>
                            <span className="text-emerald-400 font-bold">₹{((totalSalary - totalTds) / 100000).toFixed(2)}L</span>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

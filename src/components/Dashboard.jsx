import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function Dashboard() {
    const [expenses, setExpenses] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchExpenses = async () => {
            const token = localStorage.getItem('authToken');
            try {
                const response = await axios.get('http://localhost:3001/api/expenses', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setExpenses(response.data);
            } catch (err) {
                console.error("Failed to fetch expenses", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchExpenses();
    }, []);

    const categoryData = expenses.reduce((acc, expense) => {
        const category = expense.category || 'Uncategorized';
        const amount = parseFloat(expense.total_amount);
        acc[category] = (acc[category] || 0) + amount;
        return acc;
    }, {});

    const pieChartData = Object.keys(categoryData).map(key => ({
        name: key,
        value: parseFloat(categoryData[key].toFixed(2)),
    }));

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF6361'];

    if (isLoading) {
        return <p className="text-center text-gray-500 mt-10">Loading dashboard...</p>;
    }

    return (
        <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto animate-fadeIn">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Your Dashboard</h2>
            
            {expenses.length === 0 ? (
                <div className="text-center bg-white p-10 rounded-lg shadow-sm mt-10">
                    <h3 className="text-xl font-semibold text-gray-700">No expenses found</h3>
                    <p className="text-gray-500 mt-2">Get started by adding your first personal or group expense!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Chart Card */}
                    <div className="lg:col-span-1 bg-white rounded-lg shadow-md p-6 h-[25rem]">
                        <h3 className="text-xl font-semibold text-gray-800 mb-4">Spending by Category</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie 
                                    data={pieChartData} 
                                    dataKey="value" 
                                    nameKey="name" 
                                    cx="50%" 
                                    cy="50%" 
                                    outerRadius={100} 
                                    fill="#8884d8"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                >
                                    {pieChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Transactions Card */}
                    <div className="lg:col-span-2 bg-white rounded-lg shadow-md">
                        <h3 className="text-xl font-semibold text-gray-800 p-6 border-b">All Transactions</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-gray-500">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3">Date</th>
                                        <th scope="col" className="px-6 py-3">Vendor</th>
                                        <th scope="col" className="px-6 py-3">Category</th>
                                        <th scope="col" className="px-6 py-3 text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {expenses.map(expense => (
                                        <tr key={expense.id} className="bg-white border-b hover:bg-gray-50">
                                            <td className="px-6 py-4">{new Date(expense.expense_date).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{expense.vendor}</td>
                                            <td className="px-6 py-4">{expense.category}</td>
                                            <td className="px-6 py-4 font-medium text-gray-900 text-right">${parseFloat(expense.total_amount).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Dashboard;